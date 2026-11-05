import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { idParamSchema } from "@/lib/validation";

/** GET /api/saved — the current user's saved papers. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await query(
    `SELECT p.id, p.title, p.abstract, p.publication_year, c.name AS category_name, sp.created_at AS saved_at
     FROM saved_papers sp
     JOIN papers p ON p.id = sp.paper_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE sp.user_id = $1
     ORDER BY sp.created_at DESC`,
    [session.userId]
  );
  return NextResponse.json({ results: res.rows });
}

/**
 * POST /api/saved — save a paper.
 * Runs inside an explicit transaction: inserting into `saved_papers` fires
 * the `trg_saved_papers_log` trigger, which atomically inserts the matching
 * SAVE row into `paper_interactions` as part of the same transaction. If
 * either step fails (e.g. the paper doesn't exist), the whole operation
 * rolls back and no partial state is written.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const paperId = idParamSchema.safeParse(body.paperId);
  if (!paperId.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO saved_papers (user_id, paper_id) VALUES ($1, $2)
         ON CONFLICT (user_id, paper_id) DO NOTHING`,
        [session.userId, paperId.data]
      );
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23503") {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    console.error("save paper error", err);
    return NextResponse.json({ error: "Failed to save paper" }, { status: 500 });
  }
}

/** DELETE /api/saved — remove a saved paper. Body: { paperId } */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const paperId = idParamSchema.safeParse(body.paperId);
  if (!paperId.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  await query("DELETE FROM saved_papers WHERE user_id = $1 AND paper_id = $2", [session.userId, paperId.data]);
  return NextResponse.json({ ok: true });
}
