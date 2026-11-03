# System Architecture

See `System_Architecture.png` for the visual diagram. Summary of each layer:

## Frontend — Next.js (App Router) + React + TypeScript + Tailwind
Pages under `app/` are client components that call the API layer via
`fetch()`. No server-side data fetching secrets are exposed to the client;
all database access happens in API route handlers. Tailwind utility classes
only (no external UI kit) keep the bundle small and the styling
self-contained (`app/globals.css`, `tailwind.config.ts`).

## Backend — Next.js Route Handlers
Every route under `app/api/**/route.ts` is a standalone serverless-style
handler. Cross-cutting concerns are centralized in `lib/`:
- `lib/db.ts` — connection pool + `withTransaction()` helper
- `lib/auth.ts` — bcrypt hashing, JWT session cookie issue/verify
- `lib/validation.ts` — all Zod schemas
- `lib/search.ts` — keyword/semantic/hybrid search implementations
- `lib/recommendations.ts` — the recommendation scoring algorithm
- `lib/embeddings.ts` — HTTP client for the Python embedding service

This keeps route handlers thin: they parse/validate input, call a `lib/`
function, and shape the HTTP response — the actual SQL and business logic
lives in one place per concern, so there's a single source of truth for
(e.g.) "how does hybrid search compute its score."

## Data layer — PostgreSQL + pgvector
A single PostgreSQL database holds both the relational schema and the
`paper_embeddings` table with its `VECTOR(384)` column. There is no
separate vector database process to keep in sync — see
`database-design.md` for why this matters.

## Embedding microservice — Python + FastAPI + sentence-transformers
A small, stateless HTTP service (`embedding-service/main.py`) wraps
`sentence-transformers/all-MiniLM-L6-v2`. It exposes `/embed` (single text)
and `/embed/batch` (many texts). The Next.js backend is the only client of
this service; it is never called directly from the browser. This
separation exists because the embedding model is a Python-ecosystem
dependency that does not have an equivalent-quality, equivalent-size
Node.js library — isolating it behind an HTTP API keeps the main app in
pure TypeScript while still using a real, well-regarded open-source model.

## Data flow for a semantic search request
1. Browser: `GET /api/search?q=...&mode=semantic`
2. API route validates query params with Zod, calls `lib/search.ts`
3. `semanticSearch()` calls `embedText(q)` → HTTP POST to the embedding
   service → 384-dim vector
4. `semanticSearch()` issues a parameterized SQL query using the pgvector
   `<=>` cosine-distance operator, ordered and limited server-side by
   PostgreSQL (using the HNSW index)
5. Author names are joined in a second query and merged in application code
6. JSON response returned to the browser and rendered by `PaperCard`
