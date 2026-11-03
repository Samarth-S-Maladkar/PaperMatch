import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { interactionSchema } from "@/lib/validation";

/** POST /api/interactions — record a VIEW/LIKE/SAVE event directly (mainly used for VIEW). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = interactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const paperExists = await query("SELECT id FROM papers WHERE id = $1", [parsed.data.paperId]);
  if (paperExists.rows.length === 0) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  await query(
    "INSERT INTO paper_interactions (user_id, paper_id, interaction_type) VALUES ($1,$2,$3)",
    [session.userId, parsed.data.paperId, parsed.data.type]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
