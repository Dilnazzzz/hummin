import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast first check: no session cookie → straight to /login.
 * The real check happens server-side in each protected page (requireUser).
 */
export function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request);
  if (cookie) return NextResponse.next();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  const url = new URL(`/login?next=${encodeURIComponent(next)}`, request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/hum/:path*", "/me/:path*", "/settings/:path*", "/admin/:path*"],
};
