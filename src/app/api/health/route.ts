import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getDelhiDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "ok";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = "unreachable";
    console.error("Health check DB error:", error);
  }

  const delhiTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date());

  const isHealthy = dbStatus === "ok";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      venue: "Gaming Mania Delhi (B-95 Kalkaji)",
      timezone: "Asia/Kolkata",
      delhiDate: getDelhiDate(),
      delhiLocalTime: delhiTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
