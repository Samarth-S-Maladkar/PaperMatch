# Test Results

Honesty note: this table only marks a row **PASS** if it was actually
executed against a live PostgreSQL+pgvector instance during development in
this session. Rows not executed against a live instance are marked
**"Verified via build tooling only"** or **"Not executed this session"** —
they are not claimed as tested when they weren't. The next section explains
how to run the remaining tests yourself in a normal environment (this
sandbox could build and run PostgreSQL from source, but its network
egress allowlist blocks Hugging Face, so the embedding model itself could
not be downloaded here — that is a sandbox limitation, not a project
limitation. See `docs/README-testing-notes.md`-equivalent section below).

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| Load `schema.sql` into fresh PostgreSQL 16 + pgvector | All tables/indexes/views/functions/triggers created | Loaded cleanly; verified with `\d`, `\dv`, `\df` | **PASS** |
| `paper_embeddings.embedding` is `VECTOR(384)` with HNSW index | Column + index exist | Confirmed via `\d paper_embeddings` | **PASS** |
| `EXPLAIN` on cosine-distance ORDER BY / LIMIT query | Planner uses `idx_paper_embeddings_hnsw` | Confirmed — `Index Scan using idx_paper_embeddings_hnsw` in plan | **PASS** |
| `match_similar_papers(1, 5)` on category-clustered test vectors | Same-category papers rank highest | Paper #1 (AI) → top matches were both AI-category papers (0.94+ similarity) vs ~0.08–0.10 for other categories | **PASS** |
| `get_paper_statistics()` | Correct aggregate counts | Returned 30 papers / 6 users / 20 authors / 10 categories, matching seed data | **PASS** |
| Full-text search for a phrase in seeded content | Correct paper ranked first | "privacy preserving machine learning" → paper #10 (rank 1.0) | **PASS** |
| `paper_popularity_view` | Correct per-paper view/like/save counts | Matched seeded interaction counts exactly | **PASS** |
| Trigger: INSERT into `saved_papers` | Matching `SAVE` row appears in `paper_interactions` | Confirmed — row appeared with correct `paper_id`/timestamp | **PASS** |
| Transaction rollback on FK violation | 0 rows written, transaction aborted | Confirmed — `SELECT COUNT(*) ... WHERE paper_id = 999999` returned 0 | **PASS** |
| `database/demo_queries.sql` full run (joins, GROUP BY/HAVING, subqueries, correlated subquery) | All queries return correct, non-error results | All ran successfully with expected output | **PASS** |
| `scripts/seed.ts` against live DB | 30 papers / 20 authors / 10 categories / 6 bcrypt-hashed users / sample interactions loaded | Completed without error; verified via `get_paper_statistics()` | **PASS** |
| `npx tsc --noEmit` | Zero type errors | 0 errors | **PASS** |
| `npm run build` (Next.js production build) | All routes compile, 0 errors | 31/31 routes built successfully | **PASS** |
| `npm run lint` | Zero ESLint errors/warnings | "No ESLint warnings or errors" | **PASS** |
| Python embedding service `/health` | Returns `{"status":"ok", ...}` | Confirmed | **PASS** |
| Python embedding service `/embed` (actual MiniLM inference) | Returns 384-dim vector | **Not executed this session** — sandbox network egress blocks `huggingface.co`, so the model weights could not be downloaded here. Code path is implemented and the service starts correctly; this specific call needs to be run in an environment with normal internet access (e.g. via `docker compose up -d`, which has no such restriction). | **BLOCKED (sandbox only)** |
| Full HTTP API end-to-end (register → login → search → save → recommendations) via running `next dev` | All endpoints respond correctly | **Not executed this session** — the sandbox reaps detached background Node processes between tool calls, so a long-lived `next dev` server could not be kept alive for `curl` testing here. Verified indirectly via `tsc`/`build`/`lint` passing and the underlying `lib/` functions being unit-testable against the live DB. Run `npm run dev` yourself and follow the demo script in `README.md` to complete this test. | **NOT EXECUTED (sandbox only)** |
| Admin-only route rejects non-admin (403) | HTTP 403 for RESEARCHER role | Not executed this session (see above) | **NOT EXECUTED (sandbox only)** |
