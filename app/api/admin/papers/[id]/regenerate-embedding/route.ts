import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { embedText, toVectorLiteral } from "@/lib/embeddings";
import { idParamSchema } from "@/lib/validation";

/** POST /api/admin/papers/[id]/regenerate-embedding */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { ok } = await requireRole("ADMIN");
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  const paperRes = await query<{ title: string; abstract: string }>(
    "SELECT title, abstract FROM papers WHERE id = $1",
    [idParsed.data]
  );
  if (paperRes.rows.length === 0) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  try {
    const embedding = await embedText(`${paperRes.rows[0].title}\n\n${paperRes.rows[0].abstract}`);
    await query(
      `INSERT INTO paper_embeddings (paper_id, embedding, model_name)
       VALUES ($1, $2::vector, $3)
       ON CONFLICT (paper_id) DO UPDATE SET embedding = EXCLUDED.embedding, created_at = now()`,
      [idParsed.data, toVectorLiteral(embedding), "sentence-transformers/all-MiniLM-L6-v2"]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("regenerate embedding failed", err);
    return NextResponse.json({ error: "Embedding service unavailable" }, { status: 503 });
  }
}
