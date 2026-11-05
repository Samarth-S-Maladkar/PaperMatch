# Relational Schema

Notation: `PK` primary key, `FK` foreign key, `UQ` unique, `NN` not null,
`CK` check constraint. Full DDL: `database/schema.sql`.

```
USERS(
  id            UUID PK,
  name          VARCHAR(120) NN,
  email         VARCHAR(255) NN UQ CK(email format),
  password_hash TEXT NN,
  role          user_role NN DEFAULT 'RESEARCHER',   -- ENUM: RESEARCHER, ADMIN
  created_at    TIMESTAMPTZ NN,
  updated_at    TIMESTAMPTZ NN
)

CATEGORIES(
  id          SERIAL PK,
  name        VARCHAR(120) NN UQ,
  description TEXT
)

AUTHORS(
  id          SERIAL PK,
  name        VARCHAR(200) NN,
  affiliation VARCHAR(255)
)

PAPERS(
  id               SERIAL PK,
  title            VARCHAR(500) NN CK(not blank),
  abstract         TEXT NN,
  publication_year INTEGER NN CK(BETWEEN 1950 AND 2100),
  venue            VARCHAR(255),
  doi              VARCHAR(255) UQ,
  url              VARCHAR(500),
  category_id      INTEGER FK -> CATEGORIES(id) ON DELETE SET NULL,
  search_vector    TSVECTOR GENERATED ALWAYS AS (...) STORED,
  created_at       TIMESTAMPTZ NN,
  updated_at       TIMESTAMPTZ NN
)

PAPER_AUTHORS(
  paper_id     INTEGER FK -> PAPERS(id) ON DELETE CASCADE, PK(part 1),
  author_id    INTEGER FK -> AUTHORS(id) ON DELETE CASCADE, PK(part 2),
  author_order SMALLINT NN DEFAULT 1
)

RESEARCH_INTERESTS(
  id          SERIAL PK,
  name        VARCHAR(120) NN UQ,
  description TEXT
)

USER_INTERESTS(
  user_id     UUID FK -> USERS(id) ON DELETE CASCADE, PK(part 1),
  interest_id INTEGER FK -> RESEARCH_INTERESTS(id) ON DELETE CASCADE, PK(part 2),
  created_at  TIMESTAMPTZ NN
)

PAPER_INTERACTIONS(
  id               BIGSERIAL PK,
  user_id          UUID FK -> USERS(id) ON DELETE CASCADE NN,
  paper_id         INTEGER FK -> PAPERS(id) ON DELETE CASCADE NN,
  interaction_type interaction_type NN,   -- ENUM: VIEW, LIKE, SAVE
  created_at       TIMESTAMPTZ NN
)

SAVED_PAPERS(
  user_id    UUID FK -> USERS(id) ON DELETE CASCADE, PK(part 1),
  paper_id   INTEGER FK -> PAPERS(id) ON DELETE CASCADE, PK(part 2),
  created_at TIMESTAMPTZ NN
)

LIKED_PAPERS(
  user_id    UUID FK -> USERS(id) ON DELETE CASCADE, PK(part 1),
  paper_id   INTEGER FK -> PAPERS(id) ON DELETE CASCADE, PK(part 2),
  created_at TIMESTAMPTZ NN
)

PAPER_EMBEDDINGS(
  id         SERIAL PK,
  paper_id   INTEGER FK -> PAPERS(id) ON DELETE CASCADE NN UQ,
  embedding  VECTOR(384) NN,
  model_name VARCHAR(120) NN DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
  created_at TIMESTAMPTZ NN
)
```

This is the direct relational translation of the ER diagram in
`ER_Diagram.png`: every entity became a table, every 1:N relationship
became a foreign key on the "many" side, and every M:N relationship
(`paper_authors`, `user_interests`) became its own join table with a
composite primary key.
