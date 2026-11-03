# Advanced Database Features

The requirement is at least four advanced database concepts; this project
implements seven, all genuinely exercised by the application (none are
decorative SQL that the app never calls):

1. **Transactions** — `lib/db.ts`'s `withTransaction()` wraps the
   "save a paper" and "like a paper" operations
   (`app/api/saved/route.ts`, `app/api/liked/route.ts`) in explicit
   BEGIN/COMMIT/ROLLBACK. Verified live: an insert with a non-existent
   `paper_id` correctly rolled back with zero rows written.

2. **Views** — `paper_popularity_view` (per-paper view/like/save counts,
   used by the admin dashboard and by the recommendation engine's
   popularity signal) and `user_activity_view` (per-user rollup, used by
   `get_user_research_activity`). Verified with live `SELECT` queries.

3. **Stored functions** — `get_paper_statistics()` (platform-wide counts for
   the admin dashboard), `get_user_research_activity(user_id)` (dashboard
   stats), and `match_similar_papers(paper_id, limit)` (pgvector-backed
   similar-paper lookup). All three verified against a live database.

4. **Triggers** — `trg_users_updated_at` / `trg_papers_updated_at` maintain
   `updated_at` automatically on UPDATE; `trg_saved_papers_log` /
   `trg_liked_papers_log` automatically insert a matching row into
   `paper_interactions` whenever a paper is saved or liked, so the
   analytics/recommendation layer always has a consistent event log without
   the application having to remember to write it twice. Verified live:
   inserting into `saved_papers` produced a matching `SAVE` row in
   `paper_interactions` in the same transaction.

5. **Indexing** — see `database-design.md` for the full table; includes
   standard btree indexes for lookups/joins, a GIN trigram index for fuzzy
   author search, a GIN index on the generated `tsvector` column, and an
   HNSW index for vector search.

6. **Full-text search** — generated `tsvector` column (`papers.search_vector`,
   weighted title A / abstract B) + GIN index + `plainto_tsquery` +
   `ts_rank`. Verified live against seeded content.

7. **Vector similarity search** — pgvector `VECTOR(384)` column, HNSW index,
   cosine distance operator (`<=>`). Verified live, including confirming via
   `EXPLAIN` that the planner actually uses the HNSW index rather than a
   sequential scan.

Every feature listed above is called from real application code paths
(API routes or the seed/embedding scripts) — not merely present in
`schema.sql` and never used.
