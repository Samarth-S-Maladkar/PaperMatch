import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "papermatch_session";
const secretKey = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me");

export type SessionPayload = {
  userId: string;
  email: string;
  role: "RESEARCHER" | "ADMIN";
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Set the HTTP-only session cookie after login/register. */
export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Read + verify the current request's session, if any. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Throws-free helper for API routes: returns session or null. */
export async function requireRole(
  role: "RESEARCHER" | "ADMIN" | "ANY"
): Promise<{ session: SessionPayload | null; ok: boolean }> {
  const session = await getSession();
  if (!session) return { session: null, ok: false };
  if (role === "ANY") return { session, ok: true };
  if (role === "ADMIN") return { session, ok: session.role === "ADMIN" };
  return { session, ok: true }; // RESEARCHER and ADMIN can both use researcher routes
}
