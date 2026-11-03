import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { paperUpdateSchema, idParamSchema } from "@/lib/validation";

async function getPaperDetail(id: number) {
  const paperRes = await query(
    `SELECT p.*, c.name AS category_name FROM papers p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  if (paperRes.rows.length === 0) return null;

  const authorsRes = await query(
    `SELECT a.id, a.name, a.affiliation FROM paper_authors pa
     JOIN authors a ON a.id = pa.author_id
     WHERE pa.paper_id = $1 ORDER BY pa.author_order`,
    [id]
  );
  return { ...paperRes.rows[0], authors: authorsRes.rows };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  const paper = await getPaperDetail(idParsed.data);
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  return NextResponse.json(paper);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { ok } = await requireRole("ADMIN");
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  const body = await req.json();
  const parsed = paperUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const fields = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (key === "authors") continue;
    setClauses.push(`${key} = $${i++}`);
    values.push(value);
  }
  if (setClauses.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  values.push(idParsed.data);
  const res = await query(
    `UPDATE papers SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING id`,
    values
  );
  if (res.rows.length === 0) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  return NextResponse.json({ id: res.rows[0].id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { ok } = await requireRole("ADMIN");
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  // ON DELETE CASCADE on paper_authors / paper_embeddings / interactions /
  // saved_papers / liked_papers means this is safe: dependent rows are
  // removed automatically without orphaning foreign keys.
  const res = await query("DELETE FROM papers WHERE id = $1 RETURNING id", [idParsed.data]);
  if (res.rows.length === 0) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
