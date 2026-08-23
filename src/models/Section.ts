import mongoose, { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import { DP_YEARS, type DpYear } from "@/lib/constants";

export interface SectionDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  /**
   * The single source of truth: the calendar year this cohort finishes DP2.
   * DP1/DP2 and the academic-year label are derived from it (see lib/cohort),
   * so a section becomes DP2 on its own when the year rolls over.
   */
  gradYear: number;
  /**
   * Legacy fields, kept so old documents still read and so the existing
   * { name, year } unique index keeps one section per cohort. `year` is written
   * as the cohort's DP1 academic-year label; neither is used for display any
   * more — read everything through lib/cohort instead.
   */
  year: string;
  dpYear: DpYear;
  teachers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<SectionDoc>(
  {
    name: { type: String, required: true, trim: true },
    gradYear: { type: Number, required: true, index: true },
    year: { type: String, required: true, trim: true },
    dpYear: { type: String, enum: DP_YEARS, default: "DP1" },
    teachers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

// One section of a given name per cohort. `year` is the cohort's DP1 label, so
// this is equivalent to a { name, gradYear } uniqueness rule.
SectionSchema.index({ name: 1, year: 1 }, { unique: true });

export const Section = registerModel<SectionDoc>("Section", SectionSchema);
