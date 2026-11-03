import { query } from "./db";
import { embedText, toVectorLiteral, EmbeddingServiceError } from "./embeddings";

export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface SearchFilters {
  category?: number;
  year?: number;
  author?: string;
}

export interface SearchResultRow {
  id: number;
  title: string;
  abstract: string;
  publication_year: number;
  venue: string | null;
  category_name: string | null;
  authors: string[];
  score: number;
  keyword_score?: number;
  semantic_score?: number;
}

const KEYWORD_WEIGHT = 0.4;
const SEMANTIC_WEIGHT = 0.6;

function buildFilterClause(filters: SearchFilters, startIdx: number) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = startIdx;
  if (filters.category) {
    clauses.push(`p.category_id = $${idx++}`);
    params.push(filters.category);
  }
  if (filters.year) {
    clauses.push(`p.publication_year = $${idx++}`);
    params.push(filters.year);
  }
  if (filters.author) {
    clauses.push(
      `EXISTS (SELECT 1 FROM paper_authors pa2 JOIN authors a2 ON a2.id = pa2.author_id
               WHERE pa2.paper_id = p.id AND a2.name ILIKE $${idx++})`
    );
    params.push(`%${filters.author}%`);
  }
  return { clause: clauses.length ? "AND " + clauses.join(" AND ") : "", params, nextIdx: idx };
}

async function withAuthors(rows: any[]): Promise<SearchResultRow[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorRes = await query<{ paper_id: number; name: string }>(
    `SELECT pa.paper_id, a.name FROM paper_authors pa
     JOIN authors a ON a.id = pa.author_id
     WHERE pa.paper_id = ANY($1::int[])
     ORDER BY pa.paper_id, pa.author_order`,
    [ids]
  );
  const authorsByPaper = new Map<number, string[]>();
  for (const row of authorRes.rows) {
    if (!authorsByPaper.has(row.paper_id)) authorsByPaper.set(row.paper_id, []);
    authorsByPaper.get(row.paper_id)!.push(row.name);
  }
  return rows.map((r) => ({ ...r, authors: authorsByPaper.get(r.id) ?? [] }));
}

/** Keyword search using PostgreSQL full-text search (tsvector/tsquery + GIN index). */
export async function keywordSearch(
  q: string,
  filters: SearchFilters,
  page: number,
  pageSize: number
): Promise<{ rows: SearchResultRow[]; total: number }> {
  const { clause, params } = buildFilterClause(filters, 3);
  const offset = (page - 1) * pageSize;

  const rowsRes = await query(
    `SELECT p.id, p.title, p.abstract, p.publication_year, p.venue, c.name AS category_name,
            ts_rank(p.search_vector, plainto_tsquery('english', $1)) AS score
     FROM papers p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.search_vector @@ plainto_tsquery('english', $1) ${clause}
     ORDER BY score DESC
     LIMIT $2 OFFSET ${offset === 0 ? "0" : `${offset}`}`,
    [q, pageSize, ...params]
  );

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM papers p
     WHERE p.search_vector @@ plainto_tsquery('english', $1) ${clause}`,
    [q, ...params]
  );

  return { rows: await withAuthors(rowsRes.rows), total: countRes.rows[0]?.total ?? 0 };
}

/** Semantic search: embed the query, then run a pgvector cosine-distance ANN search. */
export async function semanticSearch(
  q: string,
  filters: SearchFilters,
  page: number,
  pageSize: number
): Promise<{ rows: SearchResultRow[]; total: number }> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(q);
  } catch (err) {
    if (err instanceof EmbeddingServiceError) {
      throw err;
    }
    throw new EmbeddingServiceError("Failed to reach embedding service");
  }
  const vecLiteral = toVectorLiteral(queryEmbedding);
  const { clause, params } = buildFilterClause(filters, 3);
  const offset = (page - 1) * pageSize;

  const rowsRes = await query(
    `SELECT p.id, p.title, p.abstract, p.publication_year, p.venue, c.name AS category_name,
            1 - (pe.embedding <=> $1::vector) AS score
     FROM paper_embeddings pe
     JOIN papers p ON p.id = pe.paper_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE TRUE ${clause}
     ORDER BY pe.embedding <=> $1::vector
     LIMIT $2 OFFSET ${offset}`,
    [vecLiteral, pageSize, ...params]
  );

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM paper_embeddings pe
     JOIN papers p ON p.id = pe.paper_id WHERE TRUE ${clause}`,
    params
  );

  return { rows: await withAuthors(rowsRes.rows), total: countRes.rows[0]?.total ?? 0 };
}

/**
 * Hybrid search: combine PostgreSQL full-text rank with pgvector cosine
 * similarity using a documented weighted formula:
 *   hybrid_score = 0.4 * keyword_score + 0.6 * semantic_score
 * Both component scores are normalized to [0, 1] before combining so
 * neither signal dominates purely due to differing natural scales.
 */
export async function hybridSearch(
  q: string,
  filters: SearchFilters,
  page: number,
  pageSize: number
): Promise<{ rows: SearchResultRow[]; total: number }> {
  const queryEmbedding = await embedText(q);
  const vecLiteral = toVectorLiteral(queryEmbedding);
  const { clause, params } = buildFilterClause(filters, 4);
  const offset = (page - 1) * pageSize;

  const sql = `
    WITH keyword AS (
      SELECT p.id, ts_rank(p.search_vector, plainto_tsquery('english', $1)) AS raw_score
      FROM papers p
    ),
    kw_norm AS (
      SELECT id, CASE WHEN MAX(raw_score) OVER () = 0 THEN 0
                       ELSE raw_score / NULLIF(MAX(raw_score) OVER (), 0) END AS keyword_score
      FROM keyword
    ),
    semantic AS (
      SELECT pe.paper_id AS id, 1 - (pe.embedding <=> $2::vector) AS semantic_score
      FROM paper_embeddings pe
    )
    SELECT p.id, p.title, p.abstract, p.publication_year, p.venue, c.name AS category_name,
           COALESCE(k.keyword_score, 0) AS keyword_score,
           COALESCE(s.semantic_score, 0) AS semantic_score,
           (0.4 * COALESCE(k.keyword_score, 0) + 0.6 * COALESCE(s.semantic_score, 0)) AS score
    FROM papers p
    LEFT JOIN kw_norm k ON k.id = p.id
    LEFT JOIN semantic s ON s.id = p.id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE TRUE ${clause}
    ORDER BY score DESC
    LIMIT $3 OFFSET ${offset}
  `;
  const rowsRes = await query(sql, [q, vecLiteral, pageSize, ...params]);

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM papers p WHERE TRUE ${clause}`,
    params
  );

  return { rows: await withAuthors(rowsRes.rows), total: countRes.rows[0]?.total ?? 0 };
}

export async function search(
  mode: SearchMode,
  q: string,
  filters: SearchFilters,
  page: number,
  pageSize: number
) {
  if (mode === "keyword") return keywordSearch(q, filters, page, pageSize);
  if (mode === "semantic") return semanticSearch(q, filters, page, pageSize);
  return hybridSearch(q, filters, page, pageSize);
}
