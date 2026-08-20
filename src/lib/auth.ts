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
  rejectionReason?: string;
};

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
    rejectionReason: user.rejectionReason,
  };
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
  if (!roles.includes(user.role)) redirect("/");
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
  if (roles.length && !roles.includes(user.role)) return null;
  return user;
}
