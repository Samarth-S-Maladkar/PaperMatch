-- ============================================================================
-- PaperMatch — Demonstration Queries
-- Run these against a seeded database (see README) to exercise every
-- required SQL feature. Each block is self-contained and safe to run
-- independently.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Basic SELECT + JOIN: papers with their category and author names
-- ----------------------------------------------------------------------------
SELECT p.id, p.title, c.name AS category, string_agg(a.name, ', ' ORDER BY pa.author_order) AS authors
FROM papers p
JOIN categories c ON c.id = p.category_id
JOIN paper_authors pa ON pa.paper_id = p.id
JOIN authors a ON a.id = pa.author_id
GROUP BY p.id, p.title, c.name
ORDER BY p.id
LIMIT 10;

-- ----------------------------------------------------------------------------
-- 2. GROUP BY + HAVING + aggregate functions: categories with more than
--    2 papers, showing average publication year
-- ----------------------------------------------------------------------------
SELECT c.name, COUNT(p.id) AS paper_count, AVG(p.publication_year)::NUMERIC(6,1) AS avg_year,
       MIN(p.publication_year) AS earliest, MAX(p.publication_year) AS latest
FROM categories c
JOIN papers p ON p.category_id = c.id
GROUP BY c.name
HAVING COUNT(p.id) > 2
ORDER BY paper_count DESC;

-- ----------------------------------------------------------------------------
-- 3. Subquery: papers that have never been viewed
-- ----------------------------------------------------------------------------
SELECT p.id, p.title
FROM papers p
WHERE p.id NOT IN (
    SELECT paper_id FROM paper_interactions WHERE interaction_type = 'VIEW'
)
ORDER BY p.id;

-- ----------------------------------------------------------------------------
-- 4. Correlated subquery: authors whose paper count exceeds the overall
--    average papers-per-author
-- ----------------------------------------------------------------------------
SELECT a.name,
       (SELECT COUNT(*) FROM paper_authors pa WHERE pa.author_id = a.id) AS paper_count
FROM authors a
WHERE (SELECT COUNT(*) FROM paper_authors pa WHERE pa.author_id = a.id) >
      (SELECT COUNT(*)::FLOAT / COUNT(DISTINCT author_id) FROM paper_authors)
ORDER BY paper_count DESC;

-- ----------------------------------------------------------------------------
-- 5. ORDER BY + pagination: most recent papers, page 1
-- ----------------------------------------------------------------------------
SELECT id, title, publication_year
FROM papers
ORDER BY publication_year DESC, id ASC
LIMIT 10 OFFSET 0;

-- ----------------------------------------------------------------------------
-- 6. Views: query the pre-defined popularity view
-- ----------------------------------------------------------------------------
SELECT * FROM paper_popularity_view
ORDER BY view_count DESC, like_count DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- 7. Stored functions
-- ----------------------------------------------------------------------------
SELECT * FROM get_paper_statistics();

-- Replace the UUID below with a real user id from your seeded `users` table.
-- SELECT * FROM get_user_research_activity('00000000-0000-0000-0000-000000000000');

-- Similar-papers function (pgvector under the hood)
SELECT * FROM match_similar_papers(1, 5);

-- ----------------------------------------------------------------------------
-- 8. Transaction demonstration: atomic "save paper" operation with rollback
--    on failure (the paper_id below intentionally does not exist to show the
--    rollback path; change to a valid id to see it commit).
-- ----------------------------------------------------------------------------
BEGIN;
    INSERT INTO saved_papers (user_id, paper_id)
    VALUES ('00000000-0000-0000-0000-000000000000', 999999);
    -- ^ FK violation -> triggers ROLLBACK automatically
ROLLBACK;

-- ----------------------------------------------------------------------------
-- 9. Trigger behavior: inserting into saved_papers automatically logs a SAVE
--    interaction via trg_saved_papers_log. Verify with:
-- ----------------------------------------------------------------------------
-- BEGIN;
--   INSERT INTO saved_papers (user_id, paper_id) VALUES ('<real-user-uuid>', 1);
--   SELECT * FROM paper_interactions WHERE paper_id = 1 ORDER BY id DESC LIMIT 1;
-- COMMIT;

-- ----------------------------------------------------------------------------
-- 10. Full-text search (tsvector + tsquery + GIN index)
-- ----------------------------------------------------------------------------
SELECT id, title, ts_rank(search_vector, query) AS rank
FROM papers, plainto_tsquery('english', 'privacy preserving machine learning') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
-- Note: on this small (30-row) seeded dataset the planner correctly chooses
-- a sequential scan over the GIN index (verified with EXPLAIN) because it's
-- cheaper at this table size; the GIN index earns its keep once the paper
-- catalogue grows to realistic production scale.

-- ----------------------------------------------------------------------------
-- 11. Vector similarity search (pgvector cosine distance)
--     Replace the placeholder vector with a real 384-dim query embedding
--     generated by the embedding service at query time.
-- ----------------------------------------------------------------------------
-- SELECT p.id, p.title, 1 - (pe.embedding <=> '[0.01, 0.02, ...]'::vector) AS similarity
-- FROM paper_embeddings pe
-- JOIN papers p ON p.id = pe.paper_id
-- ORDER BY pe.embedding <=> '[0.01, 0.02, ...]'::vector
-- LIMIT 10;

-- ----------------------------------------------------------------------------
-- 12. Hybrid search scoring (combining full-text rank + vector similarity)
--     This mirrors the formula implemented in lib/search.ts:
--     hybrid_score = 0.4 * keyword_score + 0.6 * semantic_score
-- ----------------------------------------------------------------------------
-- WITH keyword AS (
--   SELECT id, ts_rank(search_vector, plainto_tsquery('english', 'privacy preserving ml')) AS kscore
--   FROM papers
-- ),
-- semantic AS (
--   SELECT p.id, 1 - (pe.embedding <=> '[...]'::vector) AS sscore
--   FROM paper_embeddings pe JOIN papers p ON p.id = pe.paper_id
-- )
-- SELECT p.id, p.title,
--        COALESCE(k.kscore, 0) AS keyword_score,
--        COALESCE(s.sscore, 0) AS semantic_score,
--        (0.4 * COALESCE(k.kscore,0) + 0.6 * COALESCE(s.sscore,0)) AS hybrid_score
-- FROM papers p
-- LEFT JOIN keyword k ON k.id = p.id
-- LEFT JOIN semantic s ON s.id = p.id
-- ORDER BY hybrid_score DESC
-- LIMIT 10;

-- ----------------------------------------------------------------------------
-- 13. UPDATE / DELETE examples
-- ----------------------------------------------------------------------------
-- UPDATE papers SET venue = 'NeurIPS (Updated)' WHERE id = 1;
-- DELETE FROM saved_papers WHERE user_id = '<uuid>' AND paper_id = 1;
