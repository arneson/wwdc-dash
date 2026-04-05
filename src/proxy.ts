import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "wwdc-dash-auth";
// 30 days
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function proxy(request: NextRequest) {
  const siteKey = process.env.SITE_KEY;

  // If no SITE_KEY is configured, skip auth entirely
  if (!siteKey) {
    return NextResponse.next();
  }

  // Check for ?key= query param (first visit link)
  const keyParam = request.nextUrl.searchParams.get("key");
  if (keyParam === siteKey) {
    // Valid key — set cookie and redirect to clean URL
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(COOKIE_NAME, siteKey, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  }

  // Check for auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);
  if (authCookie?.value === siteKey) {
    return NextResponse.next();
  }

  // No valid key or cookie — block access
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>WWDC Dash</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center;
    justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
  .box { text-align: center; padding: 2rem; }
  h1 { font-size: 1.5rem; color: #111; margin-bottom: 0.5rem; }
  p { color: #6b7280; font-size: 0.875rem; }
</style>
</head>
<body>
  <div class="box">
    <h1>WWDC Week Dashboard</h1>
    <p>Access this dashboard with your private link.</p>
  </div>
</body>
</html>`,
    {
      status: 401,
      headers: { "Content-Type": "text/html" },
    }
  );
}

export const config = {
  matcher: [
    // Match everything except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
