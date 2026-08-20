import mongoose, { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import { ROLES, type Role } from "@/lib/constants";

export interface InviteUse {
  user: mongoose.Types.ObjectId;
  name: string;
  email: string;
  at: Date;
}

export interface InviteDoc {
  _id: mongoose.Types.ObjectId;
  /** The random string in the URL. */
  token: string;
  role: Role;
  /** Students always land in a section; supervisors never have one. */
  section?: mongoose.Types.ObjectId | null;
  /** How many people the admin expects to sign up with this link. */
  capacity: number;
  usedBy: InviteUse[];
  /** A note so the admin can tell two links apart. */
  label?: string;
  revoked: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InviteUseSchema = new Schema<InviteUse>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const InviteSchema = new Schema<InviteDoc>(
  {
    token: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ROLES, required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section", default: null, index: true },
    capacity: { type: Number, required: true, min: 1, max: 500 },
    usedBy: { type: [InviteUseSchema], default: [] },
    label: { type: String, default: "" },
    revoked: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Invite = registerModel<InviteDoc>("Invite", InviteSchema);

export type InviteState = "active" | "full" | "revoked";

export function inviteState(invite: {
  revoked: boolean;
  capacity: number;
  usedBy: unknown[];
}): InviteState {
  if (invite.revoked) return "revoked";
  // The link dies the moment the last expected person has joined.
  return invite.usedBy.length >= invite.capacity ? "full" : "active";
}

export function seatsLeft(invite: { capacity: number; usedBy: unknown[] }): number {
  return Math.max(0, invite.capacity - invite.usedBy.length);
}
