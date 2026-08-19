import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  authorizationUrl,
  googleConfigured,
} from "@/lib/google";

export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google-not-configured", request.url),
    );
  }

  const state = randomUUID();
  const response = NextResponse.redirect(
    authorizationUrl(request.nextUrl.origin, state),
  );
  // Round-tripped through Google and compared on the way back to block CSRF.
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
