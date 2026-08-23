import mongoose, { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import { ACCOUNT_STATUSES, ROLES, type AccountStatus, type Role } from "@/lib/constants";

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  /** Legacy: kept so pre-Google accounts are not broken. Never written now. */
  passwordHash?: string;
  googleId?: string;
  image?: string;
  role: Role;
  status: AccountStatus;
  section?: mongoose.Types.ObjectId | null;
  /** Finished the programme: may still sign in and read, but not submit. */
  graduated: boolean;
  /**
   * The calendar year the student graduated (e.g. 2028), captured at graduation
   * from their DP2 section's academic year. Shown in place of a section, which
   * is cleared when they graduate.
   */
  graduationYear?: number | null;
  /** Free-text reason shown to the user when an admin rejects the account. */
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String },
    googleId: { type: String, index: true, sparse: true },
    image: { type: String },
    role: { type: String, enum: ROLES, default: "student" },
    status: { type: String, enum: ACCOUNT_STATUSES, default: "pending" },
    section: { type: Schema.Types.ObjectId, ref: "Section", default: null },
    graduated: { type: Boolean, default: false },
    graduationYear: { type: Number, default: null },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

export const User = registerModel<UserDoc>("User", UserSchema);
