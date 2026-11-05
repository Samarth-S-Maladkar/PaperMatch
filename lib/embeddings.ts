/**
 * Thin client for the Python embedding microservice (see /embedding-service).
 * All semantic search, similar-paper lookups, and recommendation scoring
 * route through here so there is exactly one place that talks to the model.
 */
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";

export class EmbeddingServiceError extends Error {}

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    // Keep query embedding fast; don't let a stuck model call hang a request forever.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new EmbeddingServiceError(`Embedding service returned ${res.status}`);
  }
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${EMBEDDING_SERVICE_URL}/embed/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new EmbeddingServiceError(`Embedding service returned ${res.status}`);
  }
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings;
}

/** Format a JS number[] as the pgvector text literal, e.g. '[0.1,0.2,...]'. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
