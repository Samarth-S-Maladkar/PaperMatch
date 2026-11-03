# Database Design

## Why PostgreSQL + pgvector (SQL + a second database paradigm)

The project requirements permit "SQL + Vector Database" as the two-paradigm
combination, with SQL mandatory. PaperMatch uses:

- **PostgreSQL** for all structured, relational data: users, papers,
  authors, categories, interests, and the interaction/save/like event
  history. This data has clear entities, relationships, and integrity rules
  that a relational schema (with foreign keys and constraints) is the
  correct tool for.
- **pgvector** (a PostgreSQL extension, not a separate database server) for
  storing and querying dense vector embeddings of paper text. Similarity
  search over high-dimensional vectors is a fundamentally different access
  pattern than relational lookups/joins — approximate nearest-neighbour
  search over a `VECTOR(384)` column — which is exactly what pgvector's
  HNSW index is built for.

Using pgvector rather than a fully separate vector database (e.g.
Pinecone/Weaviate) keeps the two paradigms **transactionally consistent**:
a paper, its authors, and its embedding all live in the same database, so
there is never a synchronization gap between "the paper exists" and "the
paper is searchable," and a single SQL query can join relational filters
(category, year) with a vector similarity ORDER BY in one round trip — see
`lib/search.ts`'s `semanticSearch()` and `hybridSearch()`.

## Entities

See `relational-schema.md` for the full column-by-column schema with PK/FK/
constraints, and `ER_Diagram.png` for the visual model. In summary:

`users`, `papers`, `authors`, `paper_authors` (M:N), `categories`,
`research_interests`, `user_interests` (M:N), `paper_interactions`
(append-only event log), `saved_papers`, `liked_papers`, `paper_embeddings`
(pgvector).

## Normalization

The schema is in **3NF**: every non-key attribute depends on the whole
primary key and nothing but the key. Notably:
- Author information is not duplicated per paper — `paper_authors` is a
  join table so an author's name/affiliation is stored exactly once.
- Category and interest names are stored once in `categories` /
  `research_interests` and referenced by foreign key everywhere else,
  rather than being repeated as free-text strings on `papers` or `users`.
- `saved_papers` / `liked_papers` are separate from the `paper_interactions`
  log by design: the former is *current state* (was this paper saved?
  composite PK prevents duplicates), while the latter is an *append-only
  event history* (a user can view a paper many times, so `id` is a
  surrogate key, not `(user_id, paper_id)`).

## Indexes

| Index | Table.Column(s) | Type | Reason |
|---|---|---|---|
| `idx_users_email` | users.email | btree | Login lookups by email |
| `idx_papers_title` | papers.title | btree | Admin/browse sort & lookup |
| `idx_papers_year` | papers.publication_year | btree | Year filter in search |
| `idx_papers_category` | papers.category_id | btree | Category filter, FK join |
| `idx_interactions_user` | paper_interactions.user_id | btree | Dashboard/recommendation queries |
| `idx_interactions_paper` | paper_interactions.paper_id | btree | Analytics per-paper rollups |
| `idx_saved_user` / `idx_liked_user` | saved_papers/liked_papers.user_id | btree | "My saved papers" page |
| `idx_paper_authors_paper` / `_author` | paper_authors | btree | Author list per paper & vice versa |
| `idx_papers_search_vector` | papers.search_vector | **GIN** | Full-text search (tsvector containment/ranking) |
| `idx_paper_embeddings_hnsw` | paper_embeddings.embedding | **HNSW** (vector_cosine_ops) | Approximate nearest-neighbour vector search |
| `idx_authors_name_trgm` | authors.name | GIN (trigram) | Fuzzy author-name filtering in search/admin |

**Why HNSW over IVFFlat for the vector index:** IVFFlat requires choosing a
number of lists ahead of time and benefits from being trained on
representative data; its recall/speed trade-off is more sensitive to
tuning. HNSW builds an incrementally-updatable graph index with strong
recall out of the box, which suits a project where papers are added and
embedded incrementally (via the admin UI or the batch script) rather than
loaded once in bulk. This was confirmed empirically during development: an
`EXPLAIN` on the similarity query shows the planner choosing
`idx_paper_embeddings_hnsw` for the ORDER BY ... LIMIT pattern used
throughout `lib/search.ts` and `lib/recommendations.ts`.

## Constraints

- `users.email` — UNIQUE, plus a CHECK constraint validating email shape.
- `papers.doi` — UNIQUE (nullable, since not every paper has a DOI).
- `papers.publication_year` — CHECK BETWEEN 1950 AND 2100.
- `papers.title` — NOT NULL plus CHECK that it isn't blank after trimming.
- All foreign keys use `ON DELETE CASCADE` for dependent rows (e.g. deleting
  a paper cleanly removes its `paper_authors`, `paper_embeddings`,
  interactions, saves, and likes) or `ON DELETE SET NULL` where the parent
  is optional context (`papers.category_id`).
- `interaction_type` and `role` are PostgreSQL ENUM types, so the database
  itself rejects invalid values — this is not left to application-level
  validation alone (Zod validates on the way in as a first line of defense,
  but the ENUM type is the actual guarantee).
