import { query } from "./db";
import { toVectorLiteral } from "./embeddings";

/**
 * Personalized Recommendation Engine
 * ------------------------------------------------------------------------
 * recommendation_score =
 *     0.60 * semantic_similarity   (avg. cosine similarity to the user's
 *                                   "preference vector", built from saved,
 *                                   liked, and recently viewed papers)
 *   + 0.20 * interest_match        (fraction of the paper's category that
 *                                   matches a user-selected research interest)
 *   + 0.15 * interaction_score     (normalized popularity of interaction
 *                                   *with this specific paper* by similar users
 *                                   — approximated here via the paper's own
 *                                   view/like/save counts as a proxy signal)
 *   + 0.05 * popularity_score      (global popularity, log-scaled)
 *
 * Weights are configurable via the WEIGHTS export below.
 * ------------------------------------------------------------------------
 */
export const WEIGHTS = {
  semantic: 0.6,
  interest: 0.2,
  interaction: 0.15,
  popularity: 0.05,
};

export interface Recommendation {
  id: number;
  title: string;
  abstract: string;
  publication_year: number;
  category_name: string | null;
  score: number;
  reason: string;
}

/**
 * Step 1-2: build the user's "preference vector" by averaging the
 * embeddings of papers they saved, liked, or recently viewed (most recent
 * 20 views), weighting saves/likes slightly higher than plain views.
 */
async function buildPreferenceVector(userId: string): Promise<number[] | null> {
  const res = await query<{ embedding: number[]; weight: number }>(
    `
    WITH signals AS (
      SELECT paper_id, 1.5 AS weight FROM saved_papers WHERE user_id = $1
      UNION ALL
      SELECT paper_id, 1.5 AS weight FROM liked_papers WHERE user_id = $1
      UNION ALL
      SELECT paper_id, 1.0 AS weight FROM (
        SELECT paper_id FROM paper_interactions
        WHERE user_id = $1 AND interaction_type = 'VIEW'
        ORDER BY created_at DESC LIMIT 20
      ) recent_views
    )
    SELECT pe.embedding::text AS embedding_text, s.weight
    FROM signals s
    JOIN paper_embeddings pe ON pe.paper_id = s.paper_id
    `,
    [userId]
  );
  if (res.rows.length === 0) return null;

  const dim = 384;
  const sum = new Array(dim).fill(0);
  let totalWeight = 0;
  for (const row of res.rows as any[]) {
    // pgvector's ::text cast renders as "[0.1,0.2,...]", which is valid JSON.
    const vec: number[] = JSON.parse(row.embedding_text);
    for (let i = 0; i < dim; i++) sum[i] += (vec[i] ?? 0) * row.weight;
    totalWeight += row.weight;
  }
  if (totalWeight === 0) return null;
  return sum.map((v) => v / totalWeight);
}

export async function getRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
  const prefVector = await buildPreferenceVector(userId);

  // User's selected interests, by category name overlap
  const interestsRes = await query<{ name: string }>(
    `SELECT ri.name FROM user_interests ui
     JOIN research_interests ri ON ri.id = ui.interest_id
     WHERE ui.user_id = $1`,
    [userId]
  );
  const interestNames = new Set(interestsRes.rows.map((r) => r.name));

  // Papers already saved -> exclude from recommendations (Step 5)
  const excludeRes = await query<{ paper_id: number }>(
    `SELECT paper_id FROM saved_papers WHERE user_id = $1
     UNION SELECT paper_id FROM liked_papers WHERE user_id = $1`,
    [userId]
  );
  const excludeIds = excludeRes.rows.map((r) => r.paper_id);

  let candidatesSql: string;
  let params: unknown[];

  if (prefVector) {
    const vecLiteral = toVectorLiteral(prefVector);
    candidatesSql = `
      SELECT p.id, p.title, p.abstract, p.publication_year, c.name AS category_name,
             1 - (pe.embedding <=> $1::vector) AS semantic_similarity,
             pv.view_count, pv.like_count, pv.save_count
      FROM paper_embeddings pe
      JOIN papers p ON p.id = pe.paper_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN paper_popularity_view pv ON pv.paper_id = p.id
      WHERE p.id <> ALL($2::int[])
      ORDER BY pe.embedding <=> $1::vector
      LIMIT 100
    `;
    params = [vecLiteral, excludeIds.length ? excludeIds : [0]];
  } else {
    // Cold-start (Step 1-6 for a brand new user): fall back to popularity +
    // interest overlap only, since there is no interaction history yet to
    // build a semantic preference vector from.
    candidatesSql = `
      SELECT p.id, p.title, p.abstract, p.publication_year, c.name AS category_name,
             0::float AS semantic_similarity,
             pv.view_count, pv.like_count, pv.save_count
      FROM papers p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN paper_popularity_view pv ON pv.paper_id = p.id
      WHERE p.id <> ALL($1::int[])
      ORDER BY (COALESCE(pv.view_count,0) + COALESCE(pv.like_count,0)*2 + COALESCE(pv.save_count,0)*3) DESC
      LIMIT 100
    `;
    params = [excludeIds.length ? excludeIds : [0]];
  }

  const candidatesRes = await query(candidatesSql, params);
  const rows = candidatesRes.rows as any[];

  const maxPopularity = Math.max(
    1,
    ...rows.map((r) => (r.view_count ?? 0) + (r.like_count ?? 0) * 2 + (r.save_count ?? 0) * 3)
  );

  const scored: Recommendation[] = rows.map((r) => {
    const semantic = Number(r.semantic_similarity) || 0;
    const interestMatch = interestNames.has(r.category_name) ? 1 : 0;
    const popularityRaw = (r.view_count ?? 0) + (r.like_count ?? 0) * 2 + (r.save_count ?? 0) * 3;
    const popularityScore = popularityRaw / maxPopularity;
    // interaction_score proxy: how engaged users generally are with this
    // paper (likes+saves weighted higher than raw views), normalized 0-1.
    const engagementRaw = (r.like_count ?? 0) * 2 + (r.save_count ?? 0) * 3;
    const maxEngagement = Math.max(1, ...rows.map((x) => (x.like_count ?? 0) * 2 + (x.save_count ?? 0) * 3));
    const interactionScore = engagementRaw / maxEngagement;

    const score =
      WEIGHTS.semantic * semantic +
      WEIGHTS.interest * interestMatch +
      WEIGHTS.interaction * interactionScore +
      WEIGHTS.popularity * popularityScore;

    let reason = "Semantically related to your recent research activity.";
    if (interestMatch) {
      reason = `Recommended because it matches your interest in ${r.category_name}.`;
    } else if (semantic > 0.5) {
      reason = "Similar to papers you recently saved or liked.";
    } else if (!prefVector) {
      reason = "Popular among PaperMatch researchers right now.";
    }

    return {
      id: r.id,
      title: r.title,
      abstract: r.abstract,
      publication_year: r.publication_year,
      category_name: r.category_name,
      score: Math.round(score * 1000) / 1000,
      reason,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit); // Step 6: top 10
}
