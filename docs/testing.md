# Test Plan

## Authentication
- Valid registration creates a user with a bcrypt-hashed password and an
  active session cookie.
- Duplicate registration (same email) returns HTTP 409.
- Valid login returns a session; invalid credentials return HTTP 401 with a
  generic message (does not reveal whether the email exists).
- Logout clears the session cookie.

## Search
- Keyword search returns results ranked by `ts_rank` and matches expected
  papers for a query phrase drawn from real seeded abstracts.
- Semantic search embeds the query and returns pgvector cosine-similarity
  results; returns HTTP 503 (not a crash) if the embedding service is down.
- Hybrid search returns a `0.4*keyword + 0.6*semantic` blended score.
- A query matching no papers returns an empty result set and the UI shows
  "No papers found. Try a different search query."

## Papers
- Admin can create a paper (with authors) inside a transaction; a
  best-effort embedding is generated immediately afterward.
- Admin can update and delete a paper; deleting a paper cascades to its
  `paper_authors`, `paper_embeddings`, interactions, saves, and likes
  (`ON DELETE CASCADE`), leaving no orphaned rows.
- Viewing a paper's detail page records a VIEW interaction and displays
  genuinely similar papers via `match_similar_papers()`.

## Interactions
- Save/unsave and like/unlike update `saved_papers`/`liked_papers` and
  (via trigger) `paper_interactions` consistently.

## Recommendations
- A brand-new user with no history receives popularity-based
  recommendations (cold start).
- A user with saved/liked papers and selected interests receives
  recommendations with a non-zero `semantic_similarity` component and a
  specific, signal-derived `reason` string.

## Authorization
- A RESEARCHER hitting any `/api/admin/*` route receives HTTP 403.
- An ADMIN can access all admin routes and pages.

## Database
- FK constraint: inserting a `saved_papers` row referencing a non-existent
  user rolls back the transaction (verified live).
- UNIQUE constraint: registering with a duplicate email is rejected by both
  the API's pre-check and, as a backstop, the `users.email` UNIQUE
  constraint itself.
- Trigger: inserting into `saved_papers` produces a matching `SAVE` row in
  `paper_interactions` (verified live).
- View: `paper_popularity_view` returns correct aggregated counts (verified
  live).
- Stored function: `get_paper_statistics()`, `get_user_research_activity()`,
  and `match_similar_papers()` all return correct results against live data.

See `test-results.md` for the actual pass/fail record from this
development session.
