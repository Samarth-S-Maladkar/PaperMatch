import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await query<{ id: string; email: string; role: string }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'RESEARCHER')
       RETURNING id, email, role`,
      [name, email, passwordHash]
    );
    const user = inserted.rows[0];
    await setSessionCookie({ userId: user.id, email: user.email, role: user.role as "RESEARCHER" });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
