import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ profile: null }, { status: 401 });

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, session.user.id)).limit(1);
  return NextResponse.json({ profile: profile ?? null });
}
