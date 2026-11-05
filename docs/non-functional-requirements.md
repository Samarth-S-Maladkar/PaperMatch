# Non-Functional Requirements

- **Security**: passwords hashed with bcrypt (cost factor 10); sessions are
  signed JWTs in HTTP-only, SameSite=Lax cookies (Secure flag on in
  production); all SQL is parameterized (`pg` placeholders — no string
  concatenation); all API input is validated with Zod before touching the
  database; environment variables (`DATABASE_URL`, `SESSION_SECRET`,
  `EMBEDDING_SERVICE_URL`) are never hard-coded and are excluded from
  version control via `.gitignore`.
- **Data integrity**: enforced at the database level (PK/FK/UNIQUE/CHECK/NOT
  NULL), not only in the frontend — verified directly against a live
  PostgreSQL instance during development (see `testing.md`).
- **Performance**: indexes exist for every filter/join/lookup path used by
  the application (see `database-design.md` §Indexes); the HNSW index keeps
  vector search sub-linear as the catalogue grows; full-text search uses a
  GIN index over a generated, stored `tsvector` column so ranking does not
  require re-tokenizing text on every query.
- **Availability/degradation**: if the embedding microservice is down,
  keyword search still works and the API returns HTTP 503 with a clear
  message for semantic/hybrid modes rather than crashing (`lib/search.ts`,
  `lib/embeddings.ts`).
- **Usability**: every major page has loading, empty, and error states (see
  `search/page.tsx`, `saved/page.tsx`); responsive layout via Tailwind's
  default breakpoints.
- **Portability**: the entire stack (PostgreSQL+pgvector, embedding service)
  runs via `docker compose up -d`; the Next.js app has no OS-specific
  dependencies.
- **Maintainability**: a single `lib/db.ts` connection pool, a single
  `lib/search.ts` module for all three search modes, and a single
  `lib/recommendations.ts` module for the scoring algorithm, so DB access
  patterns and business logic are not duplicated across API routes.
