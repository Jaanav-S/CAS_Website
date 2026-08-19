import mongoose, { Schema, models, model } from "mongoose";

export interface SectionDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  year: string;
  teachers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<SectionDoc>(
  {
    name: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    teachers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

SectionSchema.index({ name: 1, year: 1 }, { unique: true });

export const Section =
  (models.Section as mongoose.Model<SectionDoc>) ||
  model<SectionDoc>("Section", SectionSchema);
