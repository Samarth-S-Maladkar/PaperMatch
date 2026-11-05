/**
 * scripts/generate-embeddings.ts
 *
 * 1. Fetches papers without an embedding row.
 * 2. Combines title + abstract into one string.
 * 3. Calls the embedding microservice's /embed/batch endpoint.
 * 4. Inserts the resulting vectors into paper_embeddings (pgvector column).
 * 5. Reports progress and skips papers that already have embeddings
 *    (no duplicates, safe to re-run).
 *
 * Run with: npm run db:embed
 * Requires the embedding-service to be running (docker compose up -d).
 */
import { Pool } from "pg";

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";
const MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2";
const BATCH_SIZE = 16;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: papers } = await pool.query<{ id: number; title: string; abstract: string }>(
    `SELECT p.id, p.title, p.abstract FROM papers p
     LEFT JOIN paper_embeddings pe ON pe.paper_id = p.id
     WHERE pe.id IS NULL
     ORDER BY p.id`
  );

  if (papers.length === 0) {
    console.log("All papers already have embeddings. Nothing to do.");
    await pool.end();
    return;
  }

  console.log(`Generating embeddings for ${papers.length} papers...`);

  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE);
    const texts = batch.map((p) => `${p.title}\n\n${p.abstract}`);

    const res = await fetch(`${EMBEDDING_SERVICE_URL}/embed/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    });
    if (!res.ok) {
      throw new Error(`Embedding service error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { embeddings: number[][] };

    for (let j = 0; j < batch.length; j++) {
      const vectorLiteral = `[${data.embeddings[j].join(",")}]`;
      await pool.query(
        `INSERT INTO paper_embeddings (paper_id, embedding, model_name)
         VALUES ($1, $2::vector, $3)
         ON CONFLICT (paper_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [batch[j].id, vectorLiteral, MODEL_NAME]
      );
    }
    console.log(`  Embedded ${Math.min(i + BATCH_SIZE, papers.length)} / ${papers.length}`);
  }

  console.log("Embedding generation complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Embedding generation failed:", err);
  process.exit(1);
});
