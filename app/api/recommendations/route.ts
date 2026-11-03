import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommendations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const recommendations = await getRecommendations(session.userId, 10);
    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("recommendation error", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
