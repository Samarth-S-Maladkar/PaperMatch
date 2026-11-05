import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { idParamSchema } from "@/lib/validation";

/** POST /api/liked — like a paper (mirrors /api/saved; trg_liked_papers_log logs the LIKE event). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const paperId = idParamSchema.safeParse(body.paperId);
  if (!paperId.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO liked_papers (user_id, paper_id) VALUES ($1, $2)
         ON CONFLICT (user_id, paper_id) DO NOTHING`,
        [session.userId, paperId.data]
      );
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23503") return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to like paper" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const paperId = idParamSchema.safeParse(body.paperId);
  if (!paperId.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  await query("DELETE FROM liked_papers WHERE user_id = $1 AND paper_id = $2", [session.userId, paperId.data]);
  return NextResponse.json({ ok: true });
}
