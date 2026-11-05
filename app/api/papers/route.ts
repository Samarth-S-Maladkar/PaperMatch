import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { paperCreateSchema } from "@/lib/validation";
import { embedText, toVectorLiteral } from "@/lib/embeddings";

/** GET /api/papers — paginated paper catalogue (browse, not search). */
export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") ?? 10)));
  const category = req.nextUrl.searchParams.get("category");
  const offset = (page - 1) * pageSize;

  const clause = category ? "WHERE p.category_id = $3" : "";
  const params: unknown[] = category ? [pageSize, offset, Number(category)] : [pageSize, offset];

  const rows = await query(
    `SELECT p.id, p.title, p.abstract, p.publication_year, p.venue, c.name AS category_name
     FROM papers p LEFT JOIN categories c ON c.id = p.category_id
     ${clause}
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM papers p ${clause}`,
    category ? [Number(category)] : []
  );
  return NextResponse.json({
    results: rows.rows,
    total: countRes.rows[0]?.total ?? 0,
    page,
    pageSize,
  });
}

/** POST /api/papers — admin-only paper creation, with embedding generation. */
export async function POST(req: NextRequest) {
  const { ok, session } = await requireRole("ADMIN");
  if (!ok || !session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = paperCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, abstract, publication_year, venue, doi, url, category_id, authors } = parsed.data;

  try {
    if (doi) {
      const dupe = await query("SELECT id FROM papers WHERE doi = $1", [doi]);
      if (dupe.rows.length > 0) {
        return NextResponse.json({ error: "A paper with this DOI already exists" }, { status: 409 });
      }
    }

    const paperId = await withTransaction(async (client) => {
      const paperRes = await client.query<{ id: number }>(
        `INSERT INTO papers (title, abstract, publication_year, venue, doi, url, category_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [title, abstract, publication_year, venue ?? null, doi ?? null, url ?? null, category_id ?? null]
      );
      const id = paperRes.rows[0].id;

      for (let i = 0; i < authors.length; i++) {
        const a = authors[i];
        const existingAuthor = await client.query<{ id: number }>(
          "SELECT id FROM authors WHERE name = $1",
          [a.name]
        );
        let authorId: number;
        if (existingAuthor.rows.length > 0) {
          authorId = existingAuthor.rows[0].id;
        } else {
          const created = await client.query<{ id: number }>(
            "INSERT INTO authors (name, affiliation) VALUES ($1, $2) RETURNING id",
            [a.name, a.affiliation ?? null]
          );
          authorId = created.rows[0].id;
        }
        await client.query(
          "INSERT INTO paper_authors (paper_id, author_id, author_order) VALUES ($1,$2,$3)",
          [id, authorId, i + 1]
        );
      }
      return id;
    });

    // Best-effort embedding generation; paper creation still succeeds if the
    // embedding service is temporarily down (it can be regenerated later).
    try {
      const embedding = await embedText(`${title}\n\n${abstract}`);
      await query(
        `INSERT INTO paper_embeddings (paper_id, embedding, model_name)
         VALUES ($1, $2::vector, $3)
         ON CONFLICT (paper_id) DO UPDATE SET embedding = EXCLUDED.embedding, created_at = now()`,
        [paperId, toVectorLiteral(embedding), "sentence-transformers/all-MiniLM-L6-v2"]
      );
    } catch (embedErr) {
      console.error("embedding generation failed for new paper", paperId, embedErr);
    }

    return NextResponse.json({ id: paperId }, { status: 201 });
  } catch (err) {
    console.error("create paper error", err);
    return NextResponse.json({ error: "Failed to create paper" }, { status: 500 });
  }
}
