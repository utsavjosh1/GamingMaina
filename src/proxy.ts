import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const allowDevGuest = isDevAuthBypassEnabled();
  const devGuestRoute = pathname.startsWith("/book-online") || pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const protectedRoute = devGuestRoute;

  if (protectedRoute && !hasSessionCookie && !(allowDevGuest && devGuestRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && (hasSessionCookie || allowDevGuest)) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const url = request.nextUrl.clone();
    url.pathname = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
