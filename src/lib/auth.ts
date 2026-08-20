import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/models/User";
import type { Role } from "@/lib/constants";

export const SESSION_COOKIE = "cas_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Add a random 32+ character string to .env.local.",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  status: UserDoc["status"];
  sectionId: string | null;
  graduated: boolean;
  /** Owner/maintainer access, granted by env allow-list, never stored in Mongo. */
  developer: boolean;
  rejectionReason?: string;
};

/**
 * The maintainer allow-list is stored as keyed hashes, never as addresses, so
 * the environment reveals nothing about whose account it is. Each entry in
 * MAINTAINER_KEYS is an HMAC-SHA256 of the lowercased email, keyed with
 * AUTH_SECRET — not reversible to an email, and not forgeable without the
 * secret. Comma-separated hex digests.
 *
 * Generate the digest for an address with:
 *   node -e "console.log(require('crypto').createHmac('sha256', process.env.AUTH_SECRET).update('you@example.com').digest('hex'))"
 */
function maintainerDigest(email: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function isMaintainer(email: string): boolean {
  if (!email) return false;
  const digest = maintainerDigest(email);
  const allowed = (process.env.MAINTAINER_KEYS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  // Constant-time comparison, guarding length since timingSafeEqual demands it.
  return allowed.some(
    (h) =>
      h.length === digest.length &&
      timingSafeEqual(Buffer.from(h), Buffer.from(digest)),
  );
}

function toSessionUser(user: UserDoc): SessionUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    status: user.status,
    sectionId: user.section ? String(user.section) : null,
    graduated: Boolean(user.graduated),
    developer: isMaintainer(user.email),
    rejectionReason: user.rejectionReason,
  };
}

/** Full-admin capabilities: managing coordinators, admins and the dev tier. */
export function isAdmin(user: Pick<SessionUser, "role" | "developer">): boolean {
  return user.role === "admin" || user.developer;
}

/** May reach the admin control panel — an admin, a coordinator, or the maintainer. */
export function canAdminPanel(
  user: Pick<SessionUser, "role" | "developer">,
): boolean {
  return user.role === "admin" || user.role === "coordinator" || user.developer;
}

/**
 * Reads the signed cookie and loads the user fresh from Mongo, so role or
 * approval changes made by an admin take effect on the very next request.
 * Cached per request so multiple components don't re-query.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  await dbConnect();
  const user = await User.findById(userId).lean<UserDoc>();
  if (!user) return null;
  return toSessionUser(user);
});

/** Requires a signed-in, admin-approved account. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/pending");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  // The maintainer clears every role gate; a coordinator clears any gate an
  // admin would, since a coordinator is an admin minus a couple of powers.
  if (user.developer) return user;
  const effective =
    user.role === "coordinator" && roles.includes("admin")
      ? [...roles, "coordinator" as Role]
      : roles;
  if (!effective.includes(user.role)) redirect("/");
  return user;
}

/**
 * A graduate keeps their account and can read everything, but the programme is
 * over for them, so they may no longer add to it.
 */
export function canSubmitWork(user: SessionUser): boolean {
  return user.role === "student" && !user.graduated;
}

/** API-route variant: returns null instead of redirecting. */
export async function apiUser(...roles: Role[]): Promise<SessionUser | null> {
  const user = await getSession();
  if (!user || user.status !== "approved") return null;
  if (user.developer) return user;
  const effective =
    user.role === "coordinator" && roles.includes("admin")
      ? [...roles, "coordinator" as Role]
      : roles;
  if (effective.length && !effective.includes(user.role)) return null;
  return user;
}
