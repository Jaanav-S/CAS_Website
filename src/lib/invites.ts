import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Invite, inviteState, seatsLeft, type InviteDoc } from "@/models/Invite";
import { Section, type SectionDoc } from "@/models/Section";
import type { Role } from "@/lib/constants";

export const INVITE_COOKIE = "cas_invite";

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export type InviteSummary = {
  id: string;
  token: string;
  url: string;
  role: Role;
  label: string;
  sectionName: string | null;
  sectionId: string | null;
  capacity: number;
  used: number;
  left: number;
  state: "active" | "full" | "revoked";
  createdAt: string;
  usedBy: { name: string; email: string; at: string }[];
};

export function inviteUrl(origin: string, token: string): string {
  return `${origin}/join/${token}`;
}

type Populated = Omit<InviteDoc, "section"> & {
  section?: { _id: unknown; name: string; year: string } | null;
};

export function summarise(invite: Populated, origin: string): InviteSummary {
  return {
    id: String(invite._id),
    token: invite.token,
    url: inviteUrl(origin, invite.token),
    role: invite.role,
    label: invite.label ?? "",
    sectionName: invite.section
      ? `${invite.section.name} · ${invite.section.year}`
      : null,
    sectionId: invite.section ? String(invite.section._id) : null,
    capacity: invite.capacity,
    used: invite.usedBy.length,
    left: seatsLeft(invite),
    state: inviteState(invite),
    createdAt: new Date(invite.createdAt).toISOString(),
    usedBy: invite.usedBy.map((u) => ({
      name: u.name,
      email: u.email,
      at: new Date(u.at).toISOString(),
    })),
  };
}

/** Every invite, newest first — the admin's view. */
export async function allInvites(origin: string): Promise<InviteSummary[]> {
  await dbConnect();
  const docs = await Invite.find()
    .populate("section", "name year")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return (docs as unknown as Populated[]).map((d) => summarise(d, origin));
}

/** Invites for a teacher's own sections, so they can chase who has not joined. */
export async function invitesForSections(
  sectionIds: (string | mongoose.Types.ObjectId)[],
  origin: string,
): Promise<InviteSummary[]> {
  await dbConnect();
  if (sectionIds.length === 0) return [];
  const docs = await Invite.find({ section: { $in: sectionIds }, revoked: false })
    .populate("section", "name year")
    .sort({ createdAt: -1 })
    .lean();
  return (docs as unknown as Populated[]).map((d) => summarise(d, origin));
}

export type ClaimableInvite = {
  id: string;
  role: Role;
  section: mongoose.Types.ObjectId | null;
  sectionName: string | null;
  label: string;
  left: number;
};

/**
 * Looks a token up and reports whether it can still be used. Returns null for
 * an unknown token so a wrong link cannot be told apart from a revoked one.
 */
export async function findClaimable(token: string): Promise<
  | { ok: true; invite: ClaimableInvite }
  | { ok: false; reason: "unknown" | "full" | "revoked" }
> {
  await dbConnect();
  const doc = await Invite.findOne({ token }).lean<InviteDoc>();
  if (!doc) return { ok: false, reason: "unknown" };

  const state = inviteState(doc);
  if (state !== "active") return { ok: false, reason: state };

  const section = doc.section
    ? await Section.findById(doc.section).lean<SectionDoc>()
    : null;

  return {
    ok: true,
    invite: {
      id: String(doc._id),
      role: doc.role,
      section: doc.section ?? null,
      sectionName: section ? `${section.name} · ${section.year}` : null,
      label: doc.label ?? "",
      left: seatsLeft(doc),
    },
  };
}

/**
 * Records a person against the invite, but only while a seat is genuinely
 * free. The capacity check and the write happen in one atomic update so two
 * people clicking the last seat at the same moment cannot both get in.
 */
export async function claimSeat(
  token: string,
  user: { id: string; name: string; email: string },
): Promise<boolean> {
  await dbConnect();
  const result = await Invite.updateOne(
    {
      token,
      revoked: false,
      // $expr lets us compare two fields of the same document.
      $expr: { $lt: [{ $size: "$usedBy" }, "$capacity"] },
    },
    {
      $push: {
        usedBy: {
          user: new mongoose.Types.ObjectId(user.id),
          name: user.name,
          email: user.email,
          at: new Date(),
        },
      },
    },
  );
  return result.modifiedCount === 1;
}
