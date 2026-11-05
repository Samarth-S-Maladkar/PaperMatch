# Objectives

1. Build a centralized research paper discovery platform with a normalized
   relational schema (10 tables, all in at least 3NF) enforced by
   PostgreSQL-level constraints (PK, FK, UNIQUE, CHECK, NOT NULL).
2. Implement keyword search using PostgreSQL full-text search
   (`tsvector`/`tsquery` + GIN index) as a mandatory relational-database
   capability, not a JavaScript string-matching workaround.
3. Implement true semantic paper retrieval using dense vector embeddings
   (sentence-transformers/all-MiniLM-L6-v2, 384 dimensions) stored and
   queried through the pgvector extension with an HNSW index.
4. Provide personalized, explainable recommendations that combine four
   independent signals (semantic similarity, interest match, interaction
   score, popularity) using a documented, configurable weighted formula.
5. Track user research interests as a proper many-to-many relational
   structure (`user_interests`), not a comma-separated string field.
6. Demonstrate at least four advanced database concepts beyond basic CRUD —
   this project implements seven: transactions, views, stored functions,
   triggers, indexing, full-text search, and vector similarity search.
7. Provide a fully functional Next.js/TypeScript web application — not a
   static mockup — with working authentication, authorization, and admin
   tooling, verified to compile and build cleanly (`tsc`, `next build`,
   `next lint` all pass with zero errors, documented in `testing.md`).
