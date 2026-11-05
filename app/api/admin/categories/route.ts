import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const res = await query("SELECT * FROM categories ORDER BY name");
  return NextResponse.json({ results: res.rows });
}

export async function POST(req: NextRequest) {
  const { ok } = await requireRole("ADMIN");
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = categorySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    const res = await query(
      "INSERT INTO categories (name, description) VALUES ($1,$2) RETURNING id",
      [parsed.data.name, parsed.data.description ?? null]
    );
    return NextResponse.json({ id: res.rows[0].id }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
