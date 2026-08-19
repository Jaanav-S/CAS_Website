import mongoose, { Schema } from "mongoose";
import { registerModel } from "@/lib/db";
import {
  COMPLETION_STATUSES,
  DP_YEARS,
  REVIEW_STATUSES,
  STRANDS,
  type CompletionStatus,
  type ReviewStatus,
} from "@/lib/constants";

/** One approver's verdict. A project needs both a teacher's and a supervisor's. */
export interface ProjectApproval {
  status: "pending" | "approved" | "rejected";
  by?: mongoose.Types.ObjectId | null;
  byName?: string;
  comment?: string;
  at?: Date | null;
}

export interface TimelineEntry {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  description: string;
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  addedBy: mongoose.Types.ObjectId;
  addedByName: string;
  createdAt: Date;
}

/**
 * The completion round. Unlike the first approval, a rejection here does not
 * wipe the other approver's yes — only whoever asked for changes has to look
 * again.
 */
export interface ProjectCompletion {
  status: CompletionStatus;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  teacher: ProjectApproval;
  supervisor: ProjectApproval;
}

export interface CasProjectDoc {
  _id: mongoose.Types.ObjectId;
  /** The student who created it; always also counted as a member. */
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  section?: mongoose.Types.ObjectId | null;
  dpYear?: string | null;

  title: string;
  focus: string;
  fromDate: Date;
  toDate: Date;
  casSupervisor?: mongoose.Types.ObjectId | null;
  strands: string[];

  // The four CAS stages
  investigation: string;
  planning: string;
  action: string;
  reflection: string;

  budget: string;
  donationOrg?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  externalSupervisor?: string;

  riskAssessmentRequired: boolean;
  riskAssessmentCompleted: boolean;
  precautions?: string;

  planningDocUrl?: string;
  enrollmentFormUrl?: string;

  status: ReviewStatus;
  teacherApproval: ProjectApproval;
  supervisorApproval: ProjectApproval;
  submittedAt?: Date | null;
  completion: ProjectCompletion;

  timeline: TimelineEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema<ProjectApproval>(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    byName: { type: String },
    comment: { type: String, default: "" },
    at: { type: Date, default: null },
  },
  { _id: false },
);

const TimelineSchema = new Schema<TimelineEntry>(
  {
    date: { type: Date, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    imageWidth: { type: Number },
    imageHeight: { type: Number },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedByName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const CompletionSchema = new Schema<ProjectCompletion>(
  {
    status: { type: String, enum: COMPLETION_STATUSES, default: "none" },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    teacher: { type: ApprovalSchema, default: () => ({}) },
    supervisor: { type: ApprovalSchema, default: () => ({}) },
  },
  { _id: false },
);

const CasProjectSchema = new Schema<CasProjectDoc>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    section: { type: Schema.Types.ObjectId, ref: "Section", default: null, index: true },
    dpYear: { type: String, enum: [...DP_YEARS, null], default: null, index: true },

    title: { type: String, required: true, trim: true },
    focus: { type: String, default: "" },
    fromDate: { type: Date },
    toDate: { type: Date },
    casSupervisor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    strands: { type: [String], enum: STRANDS, default: [] },

    investigation: { type: String, default: "" },
    planning: { type: String, default: "" },
    action: { type: String, default: "" },
    reflection: { type: String, default: "" },

    budget: { type: String, default: "" },
    donationOrg: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    externalSupervisor: { type: String, default: "" },

    riskAssessmentRequired: { type: Boolean, default: false },
    riskAssessmentCompleted: { type: Boolean, default: false },
    precautions: { type: String, default: "" },

    planningDocUrl: { type: String, default: "" },
    enrollmentFormUrl: { type: String, default: "" },

    status: { type: String, enum: REVIEW_STATUSES, default: "draft", index: true },
    teacherApproval: { type: ApprovalSchema, default: () => ({}) },
    supervisorApproval: { type: ApprovalSchema, default: () => ({}) },
    submittedAt: { type: Date, default: null },
    completion: { type: CompletionSchema, default: () => ({}) },

    timeline: { type: [TimelineSchema], default: [] },
  },
  { timestamps: true },
);

CasProjectSchema.index({ "completion.status": 1 });

export const CasProject = registerModel<CasProjectDoc>("CasProject", CasProjectSchema);

/**
 * A project is only approved when both approvers have said yes; a single
 * rejection sends the whole thing back to the students.
 */
export function overallStatus(
  teacher: ProjectApproval,
  supervisor: ProjectApproval,
): ReviewStatus {
  if (teacher.status === "rejected" || supervisor.status === "rejected") {
    return "rejected";
  }
  if (teacher.status === "approved" && supervisor.status === "approved") {
    return "approved";
  }
  return "pending";
}

/** A finished project is published only once both approvers agree it is done. */
export function completionStatus(
  teacher: ProjectApproval,
  supervisor: ProjectApproval,
): CompletionStatus {
  if (teacher.status === "rejected" || supervisor.status === "rejected") {
    return "rejected";
  }
  if (teacher.status === "approved" && supervisor.status === "approved") {
    return "approved";
  }
  return "pending";
}
