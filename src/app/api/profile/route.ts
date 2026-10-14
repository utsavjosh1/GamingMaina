import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDevAuthBypassProfile, isDevAuthBypassEnabled } from "@/lib/auth/dev";

export async function GET() {
  if (isDevAuthBypassEnabled()) {
    return NextResponse.json({ profile: getDevAuthBypassProfile() });
  }

  const [{ eq }, { auth }, { db }, { profiles }] = await Promise.all([
    import("drizzle-orm"),
    import("@/lib/auth"),
    import("@/lib/db"),
    import("@/lib/db/schema"),
  ]);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ profile: null }, { status: 401 });

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, session.user.id)).limit(1);
  return NextResponse.json({ profile: profile ?? null });
}
