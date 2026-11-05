# Viva Preparation

## Database design

**1. Why PostgreSQL?**
It's a mature, open-source relational database with strong support for
constraints, transactions, full-text search, and — critically for this
project — extensions like pgvector, so we don't need a second database
server to get vector similarity search.

**2. Why pgvector instead of a standalone vector database (Pinecone,
Weaviate, etc.)?**
Because pgvector is a PostgreSQL extension, papers and their embeddings
live in the same database and the same transaction. A paper can never
exist without being (eventually) searchable, and we can write a single SQL
query that joins relational filters (category, year) with a vector
similarity `ORDER BY` — see `hybridSearch()` in `lib/search.ts`. A separate
vector database would introduce a synchronization problem between two
systems.

**3. Why not MongoDB?**
This data is relational by nature — papers, authors, and categories have
clear foreign-key relationships and many-to-many joins (`paper_authors`,
`user_interests`) that a document database would either duplicate or
require application-level joins for. The requirements also mandate SQL as
the primary database.

**4. What is a vector database, conceptually?**
A system optimized for storing high-dimensional vectors and finding the
nearest vectors to a query vector, typically using an approximate
nearest-neighbour index (like HNSW) rather than an exact brute-force scan,
because exact search doesn't scale.

**5. What is cosine similarity?**
The cosine of the angle between two vectors — it measures how similarly
*directed* two vectors are regardless of their magnitude. For normalized
sentence embeddings, this is the standard way to measure semantic
closeness. In pgvector, `1 - (a <=> b)` gives cosine similarity from the
`<=>` cosine-distance operator.

**6. What is an embedding?**
A dense numerical vector (384 numbers, here) that represents the meaning of
a piece of text, produced by a neural network trained so that semantically
similar texts produce vectors that are close together in that
384-dimensional space.

**7. Why HNSW rather than IVFFlat?**
HNSW gives strong recall without needing to choose/tune a number-of-lists
parameter ahead of time and supports incremental inserts well, which suits
papers being added one at a time through the admin UI. IVFFlat needs
training on representative data and is more sensitive to tuning.

**8. What is normalization, and what normal form is this schema in?**
Normalization removes redundant data by ensuring each fact is stored once.
This schema is in 3NF: e.g. author names live only in `authors`, referenced
by `paper_authors`, rather than being repeated on every paper row.

**9. Why does `paper_authors` need to be a many-to-many join table?**
Because one paper can have multiple authors, and one author can write
multiple papers — neither a single foreign key on `papers` nor on `authors`
can represent that; you need a table whose primary key is the *pair*
`(paper_id, author_id)`.

**10. What are foreign keys and why do they matter here?**
Foreign keys enforce referential integrity — e.g. `paper_interactions.
paper_id` cannot reference a paper that doesn't exist. This is a database
level guarantee, tested live in this project by attempting to insert a
`saved_papers` row with a nonexistent `user_id` and confirming PostgreSQL
rejected it and the transaction rolled back.

## Transactions, triggers, views, functions

**11. What are transactions, and where are they used?**
A transaction groups multiple statements so they either all succeed
(COMMIT) or all fail together (ROLLBACK). `lib/db.ts`'s
`withTransaction()` wraps the "save a paper" and "create paper + insert
authors" operations, so a partial failure can't leave the database in an
inconsistent state.

**12. What are triggers, and where are they used?**
Triggers are functions PostgreSQL runs automatically in response to a
table event. `trg_saved_papers_log` fires after an INSERT on
`saved_papers` and automatically writes a matching `SAVE` row into
`paper_interactions`, so the application never has to remember to log that
event separately — and it happens inside the same transaction as the
original insert.

**13. What are views, and where are they used?**
A view is a saved, named query. `paper_popularity_view` pre-aggregates
view/like/save counts per paper and is queried directly by the admin
analytics endpoint instead of that endpoint re-writing the aggregation
logic itself.

**14. What are stored functions, and where are they used?**
Functions that live in the database and can be called like a table
(`SELECT * FROM get_paper_statistics()`) or scalar function. This project
uses three: `get_paper_statistics()`, `get_user_research_activity()`, and
`match_similar_papers()` — the last one wraps the pgvector nearest-neighbour
query so application code doesn't need to hand-write the vector SQL every
place it's needed.

**15. What is an index, generally?**
A separate data structure that lets the database find rows matching a
condition without scanning the whole table — at the cost of extra storage
and slightly slower writes.

**16. What is a GIN index, specifically, and why use one here?**
A Generalized Inverted Index — good for indexing composite/multi-valued
data like `tsvector` (many lexemes per row) or trigrams. Used on
`papers.search_vector` for full-text search and on `authors.name` (trigram
ops) for fuzzy matching.

**17. What is full-text search, and how is it implemented here?**
Search over natural-language text that understands word forms/stopwords,
not just exact substring matching. `papers.search_vector` is a generated,
stored `tsvector` column combining a weighted title + abstract; queries use
`plainto_tsquery()` and rank with `ts_rank()`.

**18. How does hybrid search work?**
It runs both the full-text rank and the pgvector cosine similarity for the
same query in one SQL statement (via CTEs), normalizes the keyword score to
[0,1], and combines them as `0.4 * keyword_score + 0.6 * semantic_score` —
see `hybridSearch()` in `lib/search.ts`.

## Recommendations & application logic

**19. How are recommendations generated?**
A user's preference vector is built as a weighted average of the
embeddings of papers they saved, liked, or recently viewed. That vector is
compared via pgvector cosine similarity against the whole catalogue, then
combined with an interest-match signal, an interaction-engagement signal,
and a popularity signal using documented weights (0.6/0.2/0.15/0.05). See
`recommendation-algorithm.md`.

**20. What happens for a brand-new user with no history?**
There's no preference vector to build, so the system falls back to
ranking by global popularity (views/likes/saves), with interest-match still
contributing if the user selected interests during onboarding. This is a
real code path (`prefVector === null` in `lib/recommendations.ts`), not
just a doc claim.

## Security & auth

**21. How are passwords stored?**
Hashed with bcrypt (cost factor 10) — never stored or logged in plaintext.
Even the seed script hashes the shared demo password before insertion.

**22. How is authorization implemented?**
A signed JWT is stored in an HTTP-only, SameSite=Lax cookie after
login/register. Every protected API route calls `requireRole()`
(`lib/auth.ts`), which verifies the JWT and checks the `role` claim
server-side — the frontend UI hiding an "Admin" link is a UX nicety, not
the actual security boundary.

**23. How is SQL injection prevented?**
All queries go through the `pg` driver's parameterized query placeholders
(`$1`, `$2`, ...) — user input is never concatenated into SQL strings.

**24. Why JWT in a cookie rather than localStorage?**
An HTTP-only cookie can't be read by client-side JavaScript, which limits
exposure to XSS-based token theft compared to storing a token in
localStorage.

## Architecture & implementation choices

**25. Why Next.js?**
It gives a single project and single language (TypeScript) for both the
frontend pages and the backend API routes, with file-based routing that
keeps the `app/api/*` structure easy to map directly onto the required
endpoint list.

**26. Why not Prisma as the ORM?**
Prisma's schema/query model doesn't cleanly represent pgvector's `VECTOR`
type, the generated `tsvector` column, hand-written stored functions, or
custom index types (HNSW, GIN). Using the `pg` driver directly with
parameterized raw SQL keeps every one of those DBMS features fully visible
and controllable, which matters for a project graded specifically on DBMS
depth.

**27. How does the frontend communicate with PostgreSQL?**
It never does directly — the frontend calls Next.js API routes over HTTP;
only server-side route handlers hold a database connection (`lib/db.ts`'s
pooled `Pool`), which the browser never has credentials for.

**28. What happens when the embedding service is unavailable?**
`embedText()` throws `EmbeddingServiceError`; `/api/search` (semantic and
hybrid modes) catches it and returns HTTP 503 with a clear message.
Keyword search is unaffected since it never calls the embedding service.

**29. How are duplicate papers prevented?**
`papers.doi` has a UNIQUE constraint, and the admin "create paper" API
pre-checks for an existing DOI before inserting, returning HTTP 409 if
found.

**30. How does save functionality work end-to-end?**
`POST /api/saved` runs inside an explicit transaction; the INSERT into
`saved_papers` fires `trg_saved_papers_log`, which inserts the matching
`SAVE` row into `paper_interactions` — both happen atomically. If the
insert violates the paper's foreign key (nonexistent paper), the whole
transaction rolls back and the API returns 404.

**31. How are analytics calculated?**
Entirely in SQL: `get_paper_statistics()` and direct queries against
`paper_popularity_view`/`categories` — the admin analytics API never pulls
the full dataset into JavaScript and aggregates it there.

**32. What are the known limitations of this project?**
See `future-enhancements.md` — briefly: the "interaction_score"
recommendation signal is a per-paper engagement proxy rather than true
collaborative filtering; there's no external paper-import integration; and
full-text search is English-only.
