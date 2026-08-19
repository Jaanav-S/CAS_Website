import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/models/User";
import { createSession } from "@/lib/auth";
import { initialAccess } from "@/lib/bootstrap";
import { GOOGLE_STATE_COOKIE, exchangeCode } from "@/lib/google";

function fail(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return fail(request, "google-cancelled");

  const code = params.get("code");
  const state = params.get("state");
  const expected = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) {
    return fail(request, "google-state");
  }

  let profile;
  try {
    profile = await exchangeCode(code, request.nextUrl.origin);
  } catch {
    return fail(request, "google-failed");
  }
  if (!profile.emailVerified) return fail(request, "google-unverified");

  await dbConnect();
  let user = await User.findOne({ email: profile.email });

  if (user) {
    // Link the Google identity to an account that signed up with a password.
    let touched = false;
    if (!user.googleId) {
      user.googleId = profile.sub;
      touched = true;
    }
    if (!user.image && profile.picture) {
      user.image = profile.picture;
      touched = true;
    }
    if (touched) await user.save();
  } else {
    const access = await initialAccess(profile.email);
    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.sub,
      image: profile.picture,
      ...access,
    });
  }

  await createSession(String((user as UserDoc)._id));

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
