import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { idParamSchema } from "@/lib/validation";

/** GET /api/interests — all available interests + the user's selected ones. */
export async function GET() {
  const session = await getSession();
  const all = await query("SELECT id, name, description FROM research_interests ORDER BY name");

  let selected: number[] = [];
  if (session) {
    const sel = await query<{ interest_id: number }>(
      "SELECT interest_id FROM user_interests WHERE user_id = $1",
      [session.userId]
    );
    selected = sel.rows.map((r) => r.interest_id);
  }
  return NextResponse.json({ interests: all.rows, selected });
}

/** POST /api/interests — add an interest. Body: { interestId } */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const interestId = idParamSchema.safeParse(body.interestId);
  if (!interestId.success) return NextResponse.json({ error: "Invalid interest id" }, { status: 400 });

  await query(
    `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2)
     ON CONFLICT (user_id, interest_id) DO NOTHING`,
    [session.userId, interestId.data]
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/interests — remove an interest. Body: { interestId } */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const interestId = idParamSchema.safeParse(body.interestId);
  if (!interestId.success) return NextResponse.json({ error: "Invalid interest id" }, { status: 400 });

  await query("DELETE FROM user_interests WHERE user_id = $1 AND interest_id = $2", [
    session.userId,
    interestId.data,
  ]);
  return NextResponse.json({ ok: true });
}
