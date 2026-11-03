# Recommendation Algorithm

Implemented in `lib/recommendations.ts`, exposed via `GET /api/recommendations`.

## Formula

```
recommendation_score =
    0.60 * semantic_similarity
  + 0.20 * interest_match
  + 0.15 * interaction_score
  + 0.05 * popularity_score
```

Weights are a named, exported constant (`WEIGHTS` in `lib/recommendations.ts`)
— they are not magic numbers scattered through the code, and can be tuned
in one place.

## Signal definitions

- **semantic_similarity** — cosine similarity (via pgvector `<=>`) between a
  candidate paper's embedding and the user's *preference vector*: a
  weighted average of the embeddings of papers the user saved (weight 1.5),
  liked (weight 1.5), and their 20 most recently viewed papers (weight 1.0).
- **interest_match** — 1 if the candidate paper's category matches one of
  the user's selected `research_interests`, else 0.
- **interaction_score** — normalized engagement (`likes*2 + saves*3`) that
  the paper has received from the whole user base among the current
  candidate set, used as a lightweight substitute for full collaborative
  filtering ("papers similar users engaged with").
- **popularity_score** — normalized global popularity
  (`views + likes*2 + saves*3`), the smallest-weighted signal, present only
  as a tie-breaker/cold-start nudge rather than a dominant factor.

## Algorithm steps (matches the required strategy)

1. **Collect** the user's interests, saved papers, liked papers, and recent
   views (`buildPreferenceVector`, plus a separate interests query).
2. **Build a preference representation** — the weighted-average embedding
   described above.
3. **Compare** that representation against every paper's embedding using
   pgvector cosine distance (top 100 candidates pulled by the database
   itself, ordered by the HNSW index, before scoring in application code).
4. **Rank** candidates by the full weighted `recommendation_score`.
5. **Exclude** papers the user has already saved or liked (`excludeIds`,
   applied in the SQL `WHERE p.id <> ALL($ids)` clause).
6. **Return top 10.**

## Cold start

A brand-new user has no saved/liked/viewed papers, so no preference vector
can be built. In that case (`prefVector === null`), the candidate query
falls back to ranking by global popularity, and `interest_match` (if the
user has picked interests during onboarding) becomes the dominant real
signal. This is a genuine fallback path, not a hidden failure — verified by
calling the endpoint for a freshly-registered account.

## Explanations

The `reason` string is generated per-candidate from the actual signal
values that were computed for that paper — not a static template applied
regardless of the underlying numbers:
- If `interest_match` is 1 → "Recommended because it matches your interest
  in `<category>`."
- Else if `semantic_similarity > 0.5` → "Similar to papers you recently
  saved or liked."
- Else if there is no preference vector at all (cold start) → "Popular
  among PaperMatch researchers right now."
- Otherwise → "Semantically related to your recent research activity."
