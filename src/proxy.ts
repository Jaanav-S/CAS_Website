import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Cheap gate only: it checks that a session cookie exists so signed-out
 * visitors are bounced to /login. Role and approval checks happen in the
 * page/route handlers, which can read the database.
 */
const PUBLIC_PATHS = ["/login", "/join", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and any request for a static file (anything with a
  // file extension, e.g. /logo-wordmark.png). Without the extension exclusion
  // the gate would redirect signed-out asset requests to /login, which is why
  // the logo appeared broken on the login and join pages.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
