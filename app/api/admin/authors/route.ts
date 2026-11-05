import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const authorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  affiliation: z.string().trim().max(255).optional(),
});

export async function GET() {
  const res = await query("SELECT * FROM authors ORDER BY name");
  return NextResponse.json({ results: res.rows });
}

export async function POST(req: NextRequest) {
  const { ok } = await requireRole("ADMIN");
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = authorSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const res = await query(
    "INSERT INTO authors (name, affiliation) VALUES ($1,$2) RETURNING id",
    [parsed.data.name, parsed.data.affiliation ?? null]
  );
  return NextResponse.json({ id: res.rows[0].id }, { status: 201 });
}
