# Vector Search

## Embedding model

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Why this model**: it is small (~80MB), runs fast on CPU (no GPU
  required, which matters for a student project that should run on a
  laptop), and gives strong semantic-similarity quality relative to its
  size — it is one of the most widely used general-purpose sentence
  embedding models for exactly this reason. Larger models (e.g. 768-dim
  BERT-based encoders) would improve quality marginally at a meaningful
  cost to setup complexity and inference latency, which is the wrong
  trade-off here.
- **Similarity metric**: cosine similarity. The model is trained/evaluated
  with cosine similarity, so the pgvector index uses `vector_cosine_ops`
  and every query uses the `<=>` (cosine distance) operator; similarity is
  reported to the user as `1 - distance`.
- **What gets embedded**: `title + "\n\n" + abstract` for each paper (see
  `scripts/generate-embeddings.ts` and the embed call in
  `app/api/papers/route.ts`), and the raw query string for a user's search.

## Storage

Each paper has at most one row in `paper_embeddings` (`paper_id UNIQUE`).
The `embedding` column is `VECTOR(384)`. An HNSW index
(`idx_paper_embeddings_hnsw`) is built on `embedding` using
`vector_cosine_ops` — verified via `EXPLAIN` during development to be the
index PostgreSQL's planner actually chooses for the `ORDER BY embedding <=>
$query LIMIT k` access pattern used everywhere in this project.

## Retrieval pipeline

```
User Query
   -> POST /embed on the Python embedding microservice
   -> 384-dim query vector
   -> PostgreSQL: SELECT ... FROM paper_embeddings
        ORDER BY embedding <=> $query_vector LIMIT k
   -> pgvector's HNSW index performs approximate nearest-neighbour search
   -> Top-K paper IDs + similarity scores
   -> Joined against papers/authors/categories for display
   -> Next.js search results page
```

This exact pipeline is implemented in `lib/search.ts`'s `semanticSearch()`
and reused (with a keyword-score blend) in `hybridSearch()`, and in
`lib/recommendations.ts` for building/comparing the user preference vector.

## Similar-paper retrieval

`match_similar_papers(paper_id, limit)` (a PostgreSQL stored function, see
`database/schema.sql`) finds the nearest other papers to a given paper's own
embedding — genuine semantic similarity, not a same-category filter. This
was specifically validated during development: paper #1 (Artificial
Intelligence) correctly surfaced other Artificial-Intelligence-category
papers as its nearest neighbours in a live test, using an `EXPLAIN` on the
underlying query to confirm the HNSW index was doing the work.

## Failure handling

If the embedding service is unreachable, `embedText()` throws an
`EmbeddingServiceError`, which `lib/search.ts` and the `/api/search*` routes
catch and turn into an HTTP 503 with a clear message — keyword search still
works, since it does not depend on the embedding service at all.
