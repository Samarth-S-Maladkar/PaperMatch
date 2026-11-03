# Future Enhancements

- **Real collaborative filtering**: the current `interaction_score` signal
  is a per-paper engagement proxy, not true user-user or item-item
  collaborative filtering. A larger interaction dataset would support a
  proper matrix-factorization or item-similarity model.
- **Ingesting external papers**: connect to arXiv/Semantic Scholar/OpenAlex
  APIs so admins can import papers by DOI rather than typing them in
  manually.
- **Re-ranking with a cross-encoder**: use the bi-encoder (MiniLM) for fast
  candidate retrieval and a heavier cross-encoder to re-rank the top ~50
  results for higher precision, at some latency cost.
- **Incremental HNSW tuning**: expose `m` / `ef_construction` / `ef_search`
  as configurable parameters and benchmark recall/latency trade-offs as the
  catalogue grows well beyond the current seeded scale.
- **Notification/digest emails**: periodic "new papers matching your
  interests" emails, which would reuse the existing recommendation engine
  with a scheduled job.
- **Multi-language support**: the current full-text search config is
  English-only (`to_tsvector('english', ...)`); a `regconfig` per paper
  would allow multi-language full-text search alongside the
  language-agnostic vector search.
- **Explainability UI**: surface the actual weighted score breakdown (not
  just the natural-language reason) to power users who want to see why a
  paper was recommended.
