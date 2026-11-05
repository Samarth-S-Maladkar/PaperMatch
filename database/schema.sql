-- ============================================================================
-- PaperMatch — Core Relational + Vector Schema
-- PostgreSQL 15+ with pgvector extension
-- ============================================================================

-- The pgvector project's PostgreSQL extension is named "vector".
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('RESEARCHER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interaction_type AS ENUM ('VIEW', 'LIKE', 'SAVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'RESEARCHER',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ----------------------------------------------------------------------------
-- CATEGORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT
);

-- ----------------------------------------------------------------------------
-- AUTHOR
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authors (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    affiliation VARCHAR(255)
);

-- ----------------------------------------------------------------------------
-- PAPER
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS papers (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(500) NOT NULL,
    abstract          TEXT NOT NULL,
    publication_year  INTEGER NOT NULL,
    venue             VARCHAR(255),
    doi               VARCHAR(255) UNIQUE,
    url               VARCHAR(500),
    category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- generated tsvector for full text search over title + abstract
    search_vector     TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(abstract, '')), 'B')
    ) STORED,
    CONSTRAINT chk_pub_year CHECK (publication_year BETWEEN 1950 AND 2100),
    CONSTRAINT chk_title_not_blank CHECK (length(btrim(title)) > 0)
);

-- ----------------------------------------------------------------------------
-- PAPER_AUTHOR (M:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_authors (
    paper_id     INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    author_id    INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    author_order SMALLINT NOT NULL DEFAULT 1,
    PRIMARY KEY (paper_id, author_id)
);

-- ----------------------------------------------------------------------------
-- RESEARCH_INTEREST
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_interests (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT
);

-- ----------------------------------------------------------------------------
-- USER_INTEREST (M:N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_interests (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest_id INTEGER NOT NULL REFERENCES research_interests(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, interest_id)
);

-- ----------------------------------------------------------------------------
-- PAPER_INTERACTION (VIEW / LIKE / SAVE log — append-only event table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_interactions (
    id               BIGSERIAL PRIMARY KEY,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id         INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    interaction_type interaction_type NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- SAVED_PAPER (current-state bookmark; distinct from the SAVE event log above)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_papers (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id   INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, paper_id)
);

-- ----------------------------------------------------------------------------
-- LIKED_PAPER (current-state; mirrors saved_papers for LIKE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liked_papers (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id   INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, paper_id)
);

-- ----------------------------------------------------------------------------
-- PAPER_EMBEDDING (pgvector)
-- all-MiniLM-L6-v2 -> 384 dimensions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paper_embeddings (
    id         SERIAL PRIMARY KEY,
    paper_id   INTEGER NOT NULL UNIQUE REFERENCES papers(id) ON DELETE CASCADE,
    embedding  VECTOR(384) NOT NULL,
    model_name VARCHAR(120) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup / auth
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Paper browsing / filtering
CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(publication_year);
CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category_id);

-- Interaction / saved lookups (dashboard, recommendations, analytics)
CREATE INDEX IF NOT EXISTS idx_interactions_user ON paper_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_paper ON paper_interactions(paper_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON paper_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_user ON liked_papers(user_id);

-- M:N join tables
CREATE INDEX IF NOT EXISTS idx_paper_authors_paper ON paper_authors(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_authors_author ON paper_authors(author_id);

-- Full text search: GIN index on the generated tsvector column.
-- Rationale: GIN is the standard PostgreSQL index type for tsvector columns;
-- it supports fast containment/ranking queries over title+abstract text.
CREATE INDEX IF NOT EXISTS idx_papers_search_vector ON papers USING GIN (search_vector);

-- Trigram index to support fast ILIKE/fuzzy author & title lookups in the admin UI.
CREATE INDEX IF NOT EXISTS idx_authors_name_trgm ON authors USING GIN (name gin_trgm_ops);

-- Vector similarity: HNSW index for approximate nearest-neighbour search on
-- cosine distance. HNSW is chosen over IVFFlat because it gives better
-- recall/latency for a dataset of this size (tens of thousands of rows or
-- fewer) without requiring a separate "training"/list-count tuning step.
CREATE INDEX IF NOT EXISTS idx_paper_embeddings_hnsw
    ON paper_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Generic updated_at maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_papers_updated_at ON papers;
CREATE TRIGGER trg_papers_updated_at
    BEFORE UPDATE ON papers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Activity-tracking trigger: whenever a row is inserted into saved_papers or
-- liked_papers, mirror it into the paper_interactions event log so the
-- analytics/recommendation layer has a single source of truth for events.
CREATE OR REPLACE FUNCTION log_save_interaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO paper_interactions (user_id, paper_id, interaction_type)
    VALUES (NEW.user_id, NEW.paper_id, 'SAVE');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saved_papers_log ON saved_papers;
CREATE TRIGGER trg_saved_papers_log
    AFTER INSERT ON saved_papers
    FOR EACH ROW EXECUTE FUNCTION log_save_interaction();

CREATE OR REPLACE FUNCTION log_like_interaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO paper_interactions (user_id, paper_id, interaction_type)
    VALUES (NEW.user_id, NEW.paper_id, 'LIKE');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_liked_papers_log ON liked_papers;
CREATE TRIGGER trg_liked_papers_log
    AFTER INSERT ON liked_papers
    FOR EACH ROW EXECUTE FUNCTION log_like_interaction();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- paper_popularity_view: aggregated engagement counts per paper
CREATE OR REPLACE VIEW paper_popularity_view AS
SELECT
    p.id                                                            AS paper_id,
    p.title,
    p.category_id,
    COUNT(*) FILTER (WHERE pi.interaction_type = 'VIEW')            AS view_count,
    COUNT(*) FILTER (WHERE pi.interaction_type = 'LIKE')            AS like_count,
    COUNT(*) FILTER (WHERE pi.interaction_type = 'SAVE')            AS save_count
FROM papers p
LEFT JOIN paper_interactions pi ON pi.paper_id = p.id
GROUP BY p.id, p.title, p.category_id;

-- user_activity_view: per-user rollup used by the dashboard
CREATE OR REPLACE VIEW user_activity_view AS
SELECT
    u.id                                                             AS user_id,
    u.name,
    COUNT(DISTINCT sp.paper_id)                                      AS saved_count,
    COUNT(DISTINCT lp.paper_id)                                      AS liked_count,
    COUNT(DISTINCT CASE WHEN pi.interaction_type = 'VIEW' THEN pi.paper_id END) AS viewed_count,
    COUNT(DISTINCT ui.interest_id)                                   AS interest_count
FROM users u
LEFT JOIN saved_papers sp ON sp.user_id = u.id
LEFT JOIN liked_papers lp ON lp.user_id = u.id
LEFT JOIN paper_interactions pi ON pi.user_id = u.id
LEFT JOIN user_interests ui ON ui.user_id = u.id
GROUP BY u.id, u.name;

-- ============================================================================
-- STORED FUNCTIONS
-- ============================================================================

-- get_paper_statistics(): global platform statistics for the admin dashboard
CREATE OR REPLACE FUNCTION get_paper_statistics()
RETURNS TABLE (
    total_papers     BIGINT,
    total_users      BIGINT,
    total_authors    BIGINT,
    total_categories BIGINT,
    total_saves      BIGINT,
    total_likes      BIGINT,
    total_views      BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM papers),
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM authors),
        (SELECT COUNT(*) FROM categories),
        (SELECT COUNT(*) FROM saved_papers),
        (SELECT COUNT(*) FROM liked_papers),
        (SELECT COUNT(*) FROM paper_interactions WHERE interaction_type = 'VIEW');
END;
$$ LANGUAGE plpgsql STABLE;

-- get_user_research_activity(user_id): per-user activity summary
CREATE OR REPLACE FUNCTION get_user_research_activity(p_user_id UUID)
RETURNS TABLE (
    saved_count    BIGINT,
    liked_count    BIGINT,
    viewed_count   BIGINT,
    interest_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT saved_count, liked_count, viewed_count, interest_count
    FROM user_activity_view
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- match_similar_papers(): pgvector cosine-distance nearest-neighbour lookup,
-- used both for "similar papers" on a paper detail page and as a building
-- block for the recommendation engine.
CREATE OR REPLACE FUNCTION match_similar_papers(
    p_paper_id INTEGER,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    paper_id   INTEGER,
    similarity DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT pe2.paper_id, (1 - (pe1.embedding <=> pe2.embedding))::DOUBLE PRECISION AS similarity
    FROM paper_embeddings pe1
    JOIN paper_embeddings pe2 ON pe2.paper_id <> pe1.paper_id
    WHERE pe1.paper_id = p_paper_id
    ORDER BY pe1.embedding <=> pe2.embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
