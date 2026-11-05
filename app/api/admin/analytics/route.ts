import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * GET /api/admin/analytics
 * All figures come from SQL aggregation (the get_paper_statistics() stored
 * function plus a handful of GROUP BY queries) — nothing is computed by
 * pulling the full dataset into JavaScript.
 */
export async function GET() {
  const { ok } = await requireRole("ADMIN");
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [stats, mostViewed, mostSaved, popularCategories, recent] = await Promise.all([
    query("SELECT * FROM get_paper_statistics()"),
    query(
      `SELECT paper_id, title, view_count FROM paper_popularity_view
       ORDER BY view_count DESC LIMIT 5`
    ),
    query(
      `SELECT paper_id, title, save_count FROM paper_popularity_view
       ORDER BY save_count DESC LIMIT 5`
    ),
    query(
      `SELECT c.name, COUNT(p.id)::int AS paper_count
       FROM categories c LEFT JOIN papers p ON p.category_id = c.id
       GROUP BY c.name ORDER BY paper_count DESC LIMIT 10`
    ),
    query(
      `SELECT pi.interaction_type, pi.created_at, p.title, u.name AS user_name
       FROM paper_interactions pi
       JOIN papers p ON p.id = pi.paper_id
       JOIN users u ON u.id = pi.user_id
       ORDER BY pi.created_at DESC LIMIT 15`
    ),
  ]);

  return NextResponse.json({
    stats: stats.rows[0],
    mostViewed: mostViewed.rows,
    mostSaved: mostSaved.rows,
    popularCategories: popularCategories.rows,
    recentActivity: recent.rows,
  });
}
