# DBMS Requirements Checklist

| Requirement | Status | Where |
|---|---|---|
| Unique project title | ✅ | "PaperMatch" |
| Meaningful real-world problem | ✅ | `problem-statement.md` |
| 2-member team | ✅ | `README.md` §Team Contributions |
| SQL database | ✅ | PostgreSQL, `database/schema.sql` |
| Second database paradigm | ✅ | pgvector (vector similarity), `database-design.md` |
| ER diagram | ✅ | `ER_Diagram.png` |
| Relational schema | ✅ | `relational-schema.md` |
| Entities, attributes, PKs, FKs, relationships | ✅ | `relational-schema.md`, `schema.sql` |
| Constraints (PK/FK/UNIQUE/NOT NULL/CHECK) | ✅ | `schema.sql`, `database-design.md` |
| CREATE / ALTER / DROP | ✅ | `schema.sql` (CREATE); triggers use DROP TRIGGER IF EXISTS |
| Indexes | ✅ | 11 indexes incl. GIN + HNSW, `database-design.md` |
| Views | ✅ | `paper_popularity_view`, `user_activity_view` |
| INSERT / UPDATE / DELETE / SELECT | ✅ | throughout API routes + `demo_queries.sql` |
| JOIN | ✅ | `demo_queries.sql` §1 |
| GROUP BY / HAVING | ✅ | `demo_queries.sql` §2 |
| ORDER BY | ✅ | `demo_queries.sql` §5, all search queries |
| Aggregate functions | ✅ | COUNT/AVG/MIN/MAX in `demo_queries.sql` §2, `get_paper_statistics()` |
| Subqueries | ✅ | `demo_queries.sql` §3–4 (incl. correlated) |
| ≥4 advanced DB concepts | ✅ (7 implemented) | `advanced-database-features.md` |
| Vector similarity search | ✅ | pgvector + HNSW, verified live via `EXPLAIN` |
| Next.js interface | ✅ | `app/` |
| Backend/API layer | ✅ | `app/api/**` |
| Environment variables | ✅ | `.env.example`, no hardcoded secrets |
| Authentication | ✅ | bcrypt + JWT cookie |
| Minimum two roles | ✅ | RESEARCHER, ADMIN |
| Database validation | ✅ | CHECK constraints + ENUMs, not just frontend Zod |
| Security | ✅ | parameterized queries, hashed passwords, HTTP-only cookies |
| Documentation | ✅ | `docs/` (this folder) |
| Git/GitHub structure | ✅ | `.gitignore`, `LICENSE`, clean folder layout |
| Testing | ✅ | `testing.md`, `test-results.md` (honest — see notes on sandbox limits) |
| Originality | ✅ | Built from scratch for this project, fictional realistic seed data |
| Functionality beyond CRUD | ✅ | Search (3 modes), recommendations, analytics, admin tooling |
