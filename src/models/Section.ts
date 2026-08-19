import mongoose, { Schema, models, model } from "mongoose";
import { DP_YEARS, type DpYear } from "@/lib/constants";

export interface SectionDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  year: string;
  dpYear: DpYear;
  teachers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<SectionDoc>(
  {
    name: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    dpYear: { type: String, enum: DP_YEARS, default: "DP1" },
    teachers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

SectionSchema.index({ name: 1, year: 1 }, { unique: true });

export const Section =
  (models.Section as mongoose.Model<SectionDoc>) ||
  model<SectionDoc>("Section", SectionSchema);
