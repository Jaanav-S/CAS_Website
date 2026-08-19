import mongoose, { Schema, models, model } from "mongoose";
import {
  EXPERIENCE_STAGES,
  LOCATIONS,
  LO_IDS,
  REVIEW_STATUSES,
  STRANDS,
  TERMS,
  type ReviewStatus,
} from "@/lib/constants";

export interface ReviewNote {
  _id?: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  teacherName: string;
  action: "rejected" | "approved";
  comment: string;
  createdAt: Date;
}

export interface ExperienceDoc {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId | null;

  // --- Step 1: proposal form ---
  year: string;
  term: string;
  title: string;
  description: string;
  strands: string[];
  location: string;
  fromDate: Date;
  toDate: Date;
  learningOutcomes: string[];
  sdgs: number[];
  investigation: string;
  learnerProfileAttributes: string[];
  learnerProfileNote?: string;
  supervisor?: string;
  casAdvisor?: mongoose.Types.ObjectId | null;
  stage: string;

  // --- Step 2: reflection blog ---
  headerImage?: string;
  images: string[];
  blogTitle?: string;
  blogBody?: string;

  // --- Review workflow ---
  status: ReviewStatus;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewNotes: ReviewNote[];

  createdAt: Date;
  updatedAt: Date;
}

const ReviewNoteSchema = new Schema<ReviewNote>(
  {
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherName: { type: String, required: true },
    action: { type: String, enum: ["rejected", "approved"], required: true },
    comment: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ExperienceSchema = new Schema<ExperienceDoc>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    section: { type: Schema.Types.ObjectId, ref: "Section", default: null, index: true },

    year: { type: String, required: true },
    term: { type: String, enum: TERMS, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    strands: {
      type: [String],
      enum: STRANDS,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "Pick at least one strand.",
      },
    },
    location: { type: String, enum: LOCATIONS, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    learningOutcomes: {
      type: [String],
      enum: LO_IDS,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "Pick at least one learning outcome.",
      },
    },
    sdgs: { type: [Number], default: [] },
    investigation: { type: String, required: true },
    learnerProfileAttributes: { type: [String], default: [] },
    learnerProfileNote: { type: String },
    supervisor: { type: String },
    casAdvisor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    stage: { type: String, enum: EXPERIENCE_STAGES, default: "Planned" },

    headerImage: { type: String },
    images: { type: [String], default: [] },
    blogTitle: { type: String },
    blogBody: { type: String },

    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "draft",
      index: true,
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewNotes: { type: [ReviewNoteSchema], default: [] },
  },
  { timestamps: true },
);

export const Experience =
  (models.Experience as mongoose.Model<ExperienceDoc>) ||
  model<ExperienceDoc>("Experience", ExperienceSchema);
