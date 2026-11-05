# PaperMatch

**Intelligent Research Paper Recommendation & Discovery System**
DBMS Level 3 University Project — PostgreSQL + pgvector, Next.js/TypeScript

---

## Project Overview

PaperMatch is a full-stack web application that helps researchers and
students discover relevant research papers through keyword, semantic, and
hybrid search, plus a personalized recommendation engine built from a
user's research interests and reading history. It combines a normalized
PostgreSQL relational schema with the pgvector extension for dense-vector
semantic search — going well beyond CRUD to demonstrate transactions,
views, stored functions, triggers, full-text search, and vector similarity
search, all genuinely exercised by the running application.

See `docs/problem-statement.md` and `docs/objectives.md` for the full
academic framing.

## Features

- Registration/login with bcrypt password hashing and HTTP-only JWT session cookies
- Two roles: RESEARCHER and ADMIN, enforced server-side on every protected route
- Paper catalogue with keyword / semantic / hybrid search, filters (category, year, author), pagination
- Save / like / view interaction tracking
- Personalized recommendations with real, signal-derived explanations
- Genuinely-similar-paper retrieval on every paper detail page (pgvector, not category filtering)
- Admin dashboard: paper/author/category management, embedding regeneration, SQL-driven analytics
- Docker Compose setup for PostgreSQL + pgvector and the Python embedding microservice

## Architecture

See `docs/architecture.md` and `docs/System_Architecture.png`.

```
User → Next.js UI → Next.js API routes → PostgreSQL + pgvector
                                        ↘ Python embedding microservice (FastAPI + sentence-transformers)
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers, TypeScript, Zod validation |
| Database | PostgreSQL 16 + pgvector extension |
| DB access | `pg` (node-postgres) with parameterized queries — see `docs/database-design.md` for why not Prisma |
| Auth | bcryptjs + `jose` (JWT) in an HTTP-only cookie |
| Embeddings | Python + FastAPI + sentence-transformers (`all-MiniLM-L6-v2`, 384-dim) |
| Infra | Docker Compose |

## Database Design

- **ER Diagram**: `docs/ER_Diagram.png`
- **Relational schema**: `docs/relational-schema.md`
- **Design rationale, indexes, constraints**: `docs/database-design.md`
- **DDL**: `database/schema.sql`
- **Seed data**: `database/seed.sql` (structural) + `scripts/seed.ts` (loads it with real bcrypt hashes and sample interactions)
- **Demo SQL queries**: `database/demo_queries.sql`

11 tables, 3NF, full PK/FK/UNIQUE/CHECK/NOT NULL constraints, 14 indexes
(including a GIN full-text index and an HNSW vector index), 2 views, 3
stored functions, 4 triggers.

## Vector Database

pgvector (PostgreSQL extension) stores a 384-dimensional embedding for each
paper (`sentence-transformers/all-MiniLM-L6-v2`, cosine similarity, HNSW
index). See `docs/vector-search.md` for the full pipeline and
`docs/database-design.md` for why PostgreSQL+pgvector was chosen over a
standalone vector database.

## Recommendation Algorithm

```
recommendation_score =
    0.60 * semantic_similarity
  + 0.20 * interest_match
  + 0.15 * interaction_score
  + 0.05 * popularity_score
```

Full explanation, cold-start handling, and explanation-generation logic in
`docs/recommendation-algorithm.md`.

---

## Installation

### Prerequisites
- Node.js 18+
- Docker + Docker Compose
- Python 3.11+ is only needed if you want to run the embedding service
  outside Docker (Docker is the recommended path and handles this for you)

### Clean install (from a freshly cloned repository)

```bash
git clone <repository-url>
cd PaperMatch
cp .env.example .env
# edit .env: set SESSION_SECRET to a random value, e.g.
#   openssl rand -base64 32

docker compose up -d          # starts PostgreSQL+pgvector and the embedding service

npm install

npm run db:init                # loads database/schema.sql
npm run db:seed                # loads seed data with real bcrypt-hashed users
npm run db:embed               # generates embeddings for all seeded papers

npm run dev                    # starts the Next.js app on http://localhost:3000
```

Then open http://localhost:3000.

> **Notes**
> - Docker Compose already loads `database/schema.sql` on first start, so `npm run db:init` is optional (it needs `psql` installed locally).
> - The `tsx` scripts (`db:seed`, `db:embed`) do not read `.env` themselves. Export it first:
>   `set -a; source .env; set +a` (Git Bash / WSL / Linux / macOS).
> - The embedding service downloads the MiniLM model (~80 MB) on first use, so the first `db:embed` can be slow.

### Environment Variables

See `.env.example`:

```
DATABASE_URL=postgresql://papermatch:papermatch_dev_password@localhost:5432/papermatch
SESSION_SECRET=            # generate with: openssl rand -base64 32
EMBEDDING_SERVICE_URL=http://localhost:8000
```

Never commit `.env` — it's excluded via `.gitignore`.

## Demo Credentials

After running `npm run db:seed`, every seeded account shares the password
`Password123!`:

| Role | Email |
|---|---|
| Researcher | `grace.anderson@rvcegrad.edu` |
| Researcher | `marcus.bell@rvcegrad.edu` |
| Researcher | `nadia.farouk@rvcegrad.edu` |
| Researcher | `tomas.ibarra@rvcegrad.edu` |
| Researcher | `priyanka.desai@rvcegrad.edu` |
| **Admin** | `admin@papermatch.edu` |

## Demonstration Script

1. Open PaperMatch at `/`.
2. Register a new account, or log in with a demo researcher account.
3. Go to `/interests` and select a few research interests.
4. Open `/dashboard` — see personalized recommendations (cold-start
   popularity-based at first, shifting toward interest/semantic matches as
   you interact with papers).
5. Go to `/search` and try: `machine learning for medical image analysis`
6. Switch between **Keyword**, **Semantic**, and **Hybrid** modes and
   compare results.
7. Open a paper's detail page — a VIEW interaction is recorded automatically.
8. Click **Save** and/or **Like**.
9. Return to `/dashboard` — recommendations update based on the new signal.
10. Scroll to **Similar Research Papers** on the paper detail page.
11. Log out, log in as `admin@papermatch.edu`.
12. Open `/admin` — view platform analytics (all SQL-aggregated).
13. Open `/admin/papers` — create a paper (embedding is generated
    automatically), or delete one (cascades cleanly via FK constraints).
14. Inspect `database/schema.sql` and `database/demo_queries.sql` directly,
    or run them with `psql`, to show the underlying SQL features.

## Testing

See `docs/testing.md` for the test plan and `docs/test-results.md` for an
honest record of what was actually executed against a live
PostgreSQL+pgvector instance during development (schema load, HNSW index
usage via `EXPLAIN`, trigger behavior, transaction rollback, full-text
search, stored functions/views, and the full `demo_queries.sql` file all
passed) versus what requires your own environment to exercise (the
embedding model download is blocked by network restrictions in the
sandbox this project was built in, and full end-to-end HTTP testing needs
a persistently-running dev server) — run `npm run dev` and follow the demo
script above to complete those checks yourself.

`npx tsc --noEmit`, `npm run build`, and `npm run lint` all pass with zero
errors/warnings as shipped.

## Advanced DBMS Concepts Implemented

Transactions · Views · Stored Functions · Triggers · Indexing (btree, GIN,
HNSW) · Full-Text Search · Vector Similarity Search — see
`docs/advanced-database-features.md` for where each is used in real
application code paths.

## Team

| Member | SRN |
|---|---|
| Samarth S. Maladkar | PES1UG24AM396 |
| Krishna G Pai | PES1UG24AM372 |

Course: UE23CS351A, Database Management Systems (PES University, Aug-Dec 2026).
The full project report is in `docs/PaperMatch_DBMS_Project_Report.docx`.

## Team Contributions

Work was split so each member owns about half of the code and database work.
Both members reviewed each other's parts.

**Samarth S. Maladkar: search, vectors and recommendations**
- Vector layer: `paper_embeddings`, HNSW index, `match_similar_papers()`
- `lib/search.ts` (keyword, semantic, hybrid), `lib/recommendations.ts`, `lib/embeddings.ts`
- `app/api/search/*`, `app/api/recommendations`, `app/api/papers/*` (CRUD and similar papers)
- Admin analytics and embedding regeneration: `app/api/admin/analytics`, `app/api/admin/papers/[id]/regenerate-embedding`
- `embedding-service/` (FastAPI + all-MiniLM-L6-v2), `scripts/generate-embeddings.ts`
- Pages: `app/search`, `app/dashboard`, `app/papers/[id]`, `app/admin/page.tsx`, `app/admin/papers`, `components/PaperCard.tsx`
- Project scaffold and configuration (`package.json`, Next.js, Tailwind, TypeScript config)

**Krishna G Pai: database, authentication and admin**
- Core schema: tables, constraints, indexes, triggers, views, functions (`database/schema.sql`)
- Seed data and queries: `database/seed.sql`, `database/seed_data.json`, `database/demo_queries.sql`, `scripts/seed.ts`
- `lib/db.ts` (pool and transactions), `lib/auth.ts` (bcrypt, JWT, role checks), `lib/validation.ts`
- `app/api/auth/*`, `interactions`, `saved`, `liked`, `interests`, `admin/authors`, `admin/categories`
- Pages: `app/login`, `app/register`, `app/interests`, `app/saved`, `app/profile`, `app/admin/authors`, `app/admin/categories`, `components/NavBar.tsx`
- `docker-compose.yml`, README and the project report

## Known Limitations

- Role-based access is enforced in the application layer only (no database GRANT/REVOKE or row-level security).
- No recursive SQL query is used.
- No automated test suite; testing is manual and SQL-level (`docs/testing.md`, `docs/test-results.md`).
- Admin authors and categories support list and create only.

## Future Enhancements

See `docs/future-enhancements.md`.

## License

MIT — see `LICENSE`.
