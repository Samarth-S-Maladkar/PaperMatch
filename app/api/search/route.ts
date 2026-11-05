import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validation";
import { EmbeddingServiceError } from "@/lib/embeddings";

/**
 * GET /api/search?q=...&mode=keyword|semantic|hybrid&category=&year=&author=&page=&pageSize=
 * A single endpoint that dispatches to keyword/semantic/hybrid search based
 * on `mode`, so the frontend search page can switch modes without changing
 * the request shape.
 */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = searchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { q, mode, category, year, author, page, pageSize } = parsed.data;

  try {
    const { rows, total } = await search(mode, q, { category, year, author }, page, pageSize);
    return NextResponse.json({
      results: rows,
      total,
      page,
      pageSize,
      mode,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    if (err instanceof EmbeddingServiceError) {
      return NextResponse.json(
        { error: "Semantic search is temporarily unavailable. Try keyword search instead." },
        { status: 503 }
      );
    }
    console.error("search error", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
