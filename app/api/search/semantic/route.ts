import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validation";
import { EmbeddingServiceError } from "@/lib/embeddings";

/** GET /api/search/semantic?q=... — pure pgvector cosine-similarity search. */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = searchQuerySchema.omit({ mode: true }).safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { q, category, year, author, page, pageSize } = parsed.data;
  try {
    const { rows, total } = await semanticSearch(q, { category, year, author }, page, pageSize);
    return NextResponse.json({ results: rows, total, page, pageSize, mode: "semantic" });
  } catch (err) {
    if (err instanceof EmbeddingServiceError) {
      return NextResponse.json({ error: "Embedding service unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
