# Functional Requirements

| # | Requirement | Implementation |
|---|---|---|
| FR1 | Users can register with name/email/password | `POST /api/auth/register`, bcrypt-hashed password |
| FR2 | Users can log in and log out | `POST /api/auth/login`, `POST /api/auth/logout`, JWT in HTTP-only cookie |
| FR3 | Users can select/deselect research interests | `GET/POST/DELETE /api/interests`, `user_interests` join table |
| FR4 | Users can browse the paper catalogue | `GET /api/papers` |
| FR5 | Users can search by keyword | `GET /api/search?mode=keyword`, PostgreSQL FTS |
| FR6 | Users can search semantically | `GET /api/search?mode=semantic`, pgvector cosine search |
| FR7 | Users can search with a hybrid keyword+semantic score | `GET /api/search?mode=hybrid`, weighted formula in `lib/search.ts` |
| FR8 | Users can filter search by category, year, author | Query params on `/api/search` |
| FR9 | Users can view full paper details | `GET /api/papers/[id]` |
| FR10 | Viewing a paper records a VIEW interaction | Paper detail page calls `POST /api/interactions` on load |
| FR11 | Users can save/unsave a paper | `POST/DELETE /api/saved`, transaction + trigger |
| FR12 | Users can like/unlike a paper | `POST/DELETE /api/liked`, transaction + trigger |
| FR13 | Users can view their saved papers | `GET /api/saved`, `/saved` page |
| FR14 | Users receive personalized recommendations | `GET /api/recommendations`, `lib/recommendations.ts` |
| FR15 | Each recommendation includes a real, signal-derived explanation | `reason` field generated from actual match data |
| FR16 | Each paper detail page shows genuinely similar papers | `GET /api/papers/[id]/similar`, `match_similar_papers()` |
| FR17 | Admins can create/update/delete papers | `POST/PATCH/DELETE /api/papers`, `/api/papers/[id]` |
| FR18 | Admins can manage authors and categories | `/api/admin/authors`, `/api/admin/categories` |
| FR19 | Admins can regenerate a paper's embedding | `POST /api/admin/papers/[id]/regenerate-embedding` |
| FR20 | Admins can view platform-wide analytics | `GET /api/admin/analytics`, SQL aggregation |
| FR21 | Non-admins cannot access admin routes | Server-side role check in every `/api/admin/*` route |
