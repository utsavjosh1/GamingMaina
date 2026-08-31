import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
