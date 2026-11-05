/**
 * scripts/seed.ts
 * Loads database/seed_data.json (categories, authors, papers, paper-author
 * links, users) into PostgreSQL, hashing real bcrypt passwords for every
 * demo user and generating a realistic spread of VIEW/LIKE/SAVE interactions
 * and research-interest selections so the dashboard and recommendation
 * engine have something to work with immediately after setup.
 *
 * Run with: npm run db:seed
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const DEMO_PASSWORD = "Password123!";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dataPath = path.join(__dirname, "..", "database", "seed_data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  console.log("Seeding categories, authors, papers, paper_authors...");
  for (const [name, description] of data.categories) {
    await pool.query(
      "INSERT INTO categories (name, description) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING",
      [name, description]
    );
    await pool.query(
      "INSERT INTO research_interests (name, description) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING",
      [name, description]
    );
  }
  for (let i = 0; i < data.authors.length; i++) {
    const [name, affiliation] = data.authors[i];
    await pool.query(
      "INSERT INTO authors (id, name, affiliation) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING",
      [i + 1, name, affiliation]
    );
  }
  await pool.query("SELECT setval(pg_get_serial_sequence('authors','id'), (SELECT MAX(id) FROM authors))");

  for (const p of data.papers) {
    await pool.query(
      `INSERT INTO papers (id, title, abstract, publication_year, venue, doi, url, category_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.title, p.abstract, p.year, p.venue, p.doi, p.url, p.category_id]
    );
  }
  await pool.query("SELECT setval(pg_get_serial_sequence('papers','id'), (SELECT MAX(id) FROM papers))");

  for (const [paperId, authorId, order] of data.paper_authors) {
    await pool.query(
      "INSERT INTO paper_authors (paper_id, author_id, author_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [paperId, authorId, order]
    );
  }

  console.log("Seeding users with bcrypt-hashed passwords...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIds: string[] = [];
  for (const [name, email, role] of data.users) {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, email, passwordHash, role]
    );
    userIds.push(res.rows[0].id);
  }

  console.log("Seeding sample interests, interactions, saves, and likes...");
  const categoryCount = data.categories.length;
  const interestIds = (await pool.query<{ id: number }>("SELECT id FROM research_interests ORDER BY id")).rows.map(
    (r) => r.id
  );
  const paperIds: number[] = data.papers.map((p: any) => p.id);

  for (const userId of userIds.slice(0, 5)) {
    // Each researcher gets 2-3 interests
    const picks = interestIds.sort(() => Math.random() - 0.5).slice(0, 2 + (userIds.indexOf(userId) % 2));
    for (const interestId of picks) {
      await pool.query(
        "INSERT INTO user_interests (user_id, interest_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [userId, interestId]
      );
    }
    // Some views
    const viewed = paperIds.sort(() => Math.random() - 0.5).slice(0, 6);
    for (const paperId of viewed) {
      await pool.query(
        "INSERT INTO paper_interactions (user_id, paper_id, interaction_type) VALUES ($1,$2,'VIEW')",
        [userId, paperId]
      );
    }
    // A couple of saves/likes (these also fire the logging triggers)
    const toSave = viewed.slice(0, 2);
    for (const paperId of toSave) {
      await pool.query(
        "INSERT INTO saved_papers (user_id, paper_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [userId, paperId]
      );
    }
    const toLike = viewed.slice(2, 4);
    for (const paperId of toLike) {
      await pool.query(
        "INSERT INTO liked_papers (user_id, paper_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [userId, paperId]
      );
    }
  }

  console.log(`Done. Demo login password for all ${userIds.length} users: ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
