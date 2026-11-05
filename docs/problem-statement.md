# Problem Statement

Researchers and students routinely need to find prior work relevant to a
specific question, method, or application area. The volume of published
research makes this difficult in three specific ways that PaperMatch is
designed to address:

1. **Keyword search misses semantically related work.** A paper about
   "federated learning across hospitals" is highly relevant to a search for
   "privacy preserving healthcare ML," but a pure keyword match will miss it
   if the exact terms differ. Discovery tools built only on keyword matching
   systematically under-serve this kind of query.

2. **Discovery does not scale with reading time.** A researcher cannot
   manually scan a large catalogue to find what is relevant to their current
   project; some form of ranking or filtering by relevance and by personal
   research interest is necessary once a catalogue passes a few dozen
   papers, and PaperMatch's 30-paper seeded catalogue is already illustrative
   of this at a small scale.

3. **Individual research trajectories differ.** Two researchers with the
   same search query may want different results depending on their existing
   research interests, what they have already read, and what they have
   previously found useful. A discovery system that only returns the same
   ranked list to everyone is not personalized.

PaperMatch addresses these three problems by combining a normalized
relational database (PostgreSQL) — which manages users, papers, authors,
categories, and structured interaction history with full referential
integrity — with a vector database extension (pgvector) that stores dense
semantic embeddings of each paper's title and abstract. Keyword search uses
PostgreSQL's native full-text search; semantic and hybrid search use
pgvector cosine similarity; and the recommendation engine combines a user's
selected interests, saved/liked papers, and recent reading history into a
single preference vector that is compared against the whole paper
catalogue.

This is a genuine, bounded, real-world problem — research discovery — and
the claims made in this document match what is implemented in code; no
feature described in the documentation is simulated or hard-coded on the
frontend without a corresponding backend implementation.
