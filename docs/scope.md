# Scope

## In scope
- User registration/login with hashed passwords and session cookies.
- Two roles: RESEARCHER and ADMIN, enforced server-side on every protected route.
- Paper catalogue browsing, keyword/semantic/hybrid search with filters
  (category, year, author) and pagination.
- Save / like / view interaction tracking, feeding both analytics and
  recommendations.
- Personalized recommendation engine with human-readable explanations.
- Similar-paper retrieval via pgvector on each paper's detail page.
- Admin paper/author/category management, including manual embedding
  regeneration.
- Admin analytics dashboard computed via SQL aggregation (views + a stored
  function), not client-side computation over the full dataset.
- Docker Compose setup for PostgreSQL + pgvector and the embedding service.
- Seed data: 30 papers, 20 authors, 10 categories, 6 users, realistic
  interaction history.

## Out of scope
- Payment, subscription, or multi-tenant organization features.
- Real-time collaborative features (comments, shared reading lists).
- Ingesting papers from external APIs (arXiv, Semantic Scholar, etc.) —
  papers are seeded/administered manually, which is sufficient to
  demonstrate every required database and search capability.
- Production-grade horizontal scaling, load balancing, or CDN configuration
  — this is a university DBMS project, not a production SaaS deployment.
- Fine-tuning or training the embedding model — a pretrained,
  off-the-shelf sentence-transformer is used as-is, which is appropriate and
  documented in `vector-search.md`.
