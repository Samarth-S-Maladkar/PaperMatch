import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const res = await query<{ id: string; email: string; password_hash: string; role: string }>(
      "SELECT id, email, password_hash, role FROM users WHERE email = $1",
      [email]
    );
    const user = res.rows[0];
    // Same error message for "no such user" and "wrong password" so we don't
    // leak which emails are registered.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await setSessionCookie({ userId: user.id, email: user.email, role: user.role as "RESEARCHER" | "ADMIN" });
    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
