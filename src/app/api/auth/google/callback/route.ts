import { NextResponse, type NextRequest } from "next/server";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/models/User";
import { Section } from "@/models/Section";
import { createSession, isMaintainer } from "@/lib/auth";
import { isBootstrapAdmin } from "@/lib/bootstrap";
import { GOOGLE_STATE_COOKIE, exchangeCode } from "@/lib/google";
import { INVITE_COOKIE, claimSeat, findClaimable } from "@/lib/invites";

function fail(request: NextRequest, code: string, token?: string) {
  // Send invite problems back to the invite page, where they make sense.
  const base = token ? `/join/${token}` : "/login";
  return NextResponse.redirect(new URL(`${base}?error=${code}`, request.url));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = request.cookies.get(INVITE_COOKIE)?.value;

  if (params.get("error")) return fail(request, "google-cancelled", token);

  const code = params.get("code");
  const state = params.get("state");
  const expected = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) {
    return fail(request, "google-state", token);
  }

  let profile;
  try {
    profile = await exchangeCode(code, request.nextUrl.origin);
  } catch {
    return fail(request, "google-failed", token);
  }
  if (!profile.emailVerified) return fail(request, "google-unverified", token);

  await dbConnect();
  let user = await User.findOne({ email: profile.email });

  if (user) {
    // Somebody who already has an account just signs in; the invite, if any,
    // is left alone so its seats are not spent on an existing member.
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
  } else if (token) {
    // A brand-new person: the invite decides who they are.
    const found = await findClaimable(token);
    if (!found.ok) return fail(request, `invite-${found.reason}`, token);

    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.sub,
      image: profile.picture,
      role: found.invite.role,
      // The link is the approval — nobody has to wave them through afterwards.
      status: "approved",
      section: found.invite.section,
    });

    const claimed = await claimSeat(token, {
      id: String(user._id),
      name: user.name,
      email: user.email,
    });
    if (!claimed) {
      // Somebody took the last seat between the check and the write.
      await User.findByIdAndDelete(user._id);
      return fail(request, "invite-full", token);
    }

    // A teacher invited into a section should be able to review it at once.
    if (found.invite.role === "teacher" && found.invite.section) {
      await Section.updateOne(
        { _id: found.invite.section },
        { $addToSet: { teachers: user._id } },
      );
    }
  } else if (isMaintainer(profile.email) || (await isBootstrapAdmin(profile.email))) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.sub,
      image: profile.picture,
      role: "admin",
      status: "approved",
    });
  } else {
    // No account, no invite: there is no self-signup any more.
    return fail(request, "no-invite");
  }

  await createSession(String((user as UserDoc)._id));

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  response.cookies.delete(INVITE_COOKIE);
  return response;
}
