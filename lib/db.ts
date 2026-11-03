/**
 * Central PostgreSQL connection pool.
 *
 * We use the `pg` driver directly (rather than an ORM like Prisma) because
 * this project relies heavily on raw pgvector operators (`<=>` for cosine
 * distance), generated tsvector columns, custom stored functions, and
 * hand-tuned indexes (HNSW, GIN) that Prisma's query builder and schema
 * migration model do not represent well. Using `pg` with parameterized
 * queries keeps every SQL feature (transactions, views, functions,
 * triggers, full-text search, vector search) fully under our control and
 * fully visible for the DBMS grading requirements, while still protecting
 * against SQL injection via parameterized query placeholders ($1, $2, ...).
 */
import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export const pool: Pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params);
}

/** Run a set of statements inside a single transaction (BEGIN/COMMIT/ROLLBACK). */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
