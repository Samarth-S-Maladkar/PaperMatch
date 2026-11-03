import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { idParamSchema } from "@/lib/validation";

/**
 * GET /api/papers/[id]/similar
 * Uses the paper's own pgvector embedding to find nearest neighbours via the
 * match_similar_papers() stored function — genuine semantic similarity, not
 * a same-category filter.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const idParsed = idParamSchema.safeParse(params.id);
  if (!idParsed.success) return NextResponse.json({ error: "Invalid paper id" }, { status: 400 });

  const hasEmbedding = await query("SELECT 1 FROM paper_embeddings WHERE paper_id = $1", [idParsed.data]);
  if (hasEmbedding.rows.length === 0) {
    return NextResponse.json({ results: [], note: "No embedding available for this paper yet." });
  }

  const similarRes = await query<{ paper_id: number; similarity: number }>(
    "SELECT * FROM match_similar_papers($1, $2)",
    [idParsed.data, 5]
  );
  if (similarRes.rows.length === 0) return NextResponse.json({ results: [] });

  const ids = similarRes.rows.map((r) => r.paper_id);
  const papersRes = await query(
    `SELECT p.id, p.title, p.abstract, p.publication_year, c.name AS category_name
     FROM papers p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ANY($1::int[])`,
    [ids]
  );
  const byId = new Map(papersRes.rows.map((r: any) => [r.id, r]));
  const results = similarRes.rows
    .map((r) => ({ ...byId.get(r.paper_id), similarity: r.similarity }))
    .filter((r) => r.id);

  return NextResponse.json({ results });
}
