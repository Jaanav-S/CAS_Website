import { z } from "zod";
import {
  EXPERIENCE_STAGES,
  MAX_PROJECT_MEMBERS,
  LEARNER_PROFILE,
  LOCATIONS,
  LO_IDS,
  STRANDS,
  TERMS,
} from "@/lib/constants";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/** Step 1 — the CAS experience proposal form. */
const proposalObject = z
  .object({
    year: z.string().trim().min(4, "Select a year."),
    term: z.enum(TERMS),
    title: z.string().trim().min(3, "Give your experience a title."),
    description: z
      .string()
      .trim()
      .min(20, "Describe the experience in at least 20 characters."),
    strands: z
      .array(z.enum(STRANDS))
      .min(1, "Select at least one strand of C, A and S."),
    location: z.enum(LOCATIONS),
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
    learningOutcomes: z
      .array(z.enum(LO_IDS as [string, ...string[]]))
      .min(1, "Select at least one learning outcome."),
    sdgs: z.array(z.number().int().min(1).max(17)).default([]),
    investigation: z
      .string()
      .trim()
      .min(20, "Describe your skills, interest and purpose."),
    learnerProfileAttributes: z.array(z.enum(LEARNER_PROFILE)).default([]),
    learnerProfileNote: z.string().trim().default(""),
    supervisor: z.string().trim().default(""),
    casAdvisor: objectId.nullish(),
    stage: z.enum(EXPERIENCE_STAGES),
  });

export const proposalSchema = proposalObject.refine(
  (data) => data.toDate >= data.fromDate,
  {
    message: "The end date cannot be before the start date.",
    path: ["toDate"],
  },
);

/**
 * Autosave writes whatever the student has typed so far, so every field is
 * optional and the length rules are relaxed — a half-written draft must always
 * be storable. The strict rules above are enforced again on submit.
 */
export const proposalDraftSchema = proposalObject
  .extend({
    year: z.string().trim(),
    title: z.string().trim(),
    description: z.string().trim(),
    strands: z.array(z.enum(STRANDS)),
    learningOutcomes: z.array(z.enum(LO_IDS as [string, ...string[]])),
    investigation: z.string().trim(),
    fromDate: z.coerce.date().nullish(),
    toDate: z.coerce.date().nullish(),
  })
  .partial();

export type ProposalInput = z.infer<typeof proposalSchema>;

/** Step 2 — the reflection blog. A header image is required. */
export const blogSchema = z.object({
  blogTitle: z.string().trim().min(3, "Give your reflection a title."),
  blogBody: z
    .string()
    .trim()
    .min(100, "Write at least 100 characters about your experience."),
  headerImage: z.string().trim().min(1, "A header image is required."),
  headerWidth: z.number().int().positive().nullish(),
  headerHeight: z.number().int().positive().nullish(),
  images: z.array(z.string().trim()).default([]),
});

/**
 * Draft writes of the reflection: same fields, none of the length rules, so a
 * sentence-and-a-half is storable. blogSchema is applied again on submit.
 */
export const blogDraftSchema = z
  .object({
    blogTitle: z.string().trim(),
    blogBody: z.string().trim(),
    headerImage: z.string().trim(),
    headerWidth: z.number().int().positive().nullish(),
    headerHeight: z.number().int().positive().nullish(),
    images: z.array(z.string().trim()),
  })
  .partial();

export const reviewSchema = z
  .object({
    action: z.enum(["approve", "reject", "takedown"]),
    comment: z.string().trim().default(""),
  })
  .refine((d) => d.action === "approve" || d.comment.length >= 5, {
    message: "Tell the student why, so they know what to change.",
    path: ["comment"],
  });

// ---------------------------------------------------------------- projects

const optionalUrl = z
  .union([z.string().trim().url("Enter a full link starting with https://"), z.literal("")])
  .default("");

const projectObject = z.object({
  title: z.string().trim().min(3, "Give the project a title."),
  focus: z.string().trim().min(10, "Describe the focus or objective."),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  casSupervisor: z.string().regex(/^[0-9a-fA-F]{24}$/).nullish(),
  strands: z.array(z.enum(STRANDS)).min(1, "Select at least one strand."),
  investigation: z.string().trim().min(10, "Describe your investigation."),
  planning: z.string().trim().min(10, "Describe your preparation and planning."),
  action: z.string().trim().min(10, "Describe the action."),
  reflection: z.string().trim().min(10, "Describe your reflection."),
  budget: z.string().trim().default(""),
  donationOrg: z.string().trim().default(""),
  contactPerson: z.string().trim().default(""),
  contactPhone: z.string().trim().default(""),
  contactEmail: z
    .union([z.string().trim().email("Enter a valid contact email."), z.literal("")])
    .default(""),
  externalSupervisor: z.string().trim().default(""),
  riskAssessmentRequired: z.boolean().default(false),
  riskAssessmentCompleted: z.boolean().default(false),
  precautions: z.string().trim().default(""),
  planningDocUrl: optionalUrl,
  enrollmentFormUrl: optionalUrl,
  memberEmails: z
    .array(z.string().trim().toLowerCase().email("That is not a valid email."))
    .max(MAX_PROJECT_MEMBERS, `You can add at most ${MAX_PROJECT_MEMBERS} people.`)
    .default([]),
});

export const projectSchema = projectObject
  .refine((d) => d.toDate >= d.fromDate, {
    message: "The end date cannot be before the start date.",
    path: ["toDate"],
  })
  .refine((d) => !d.riskAssessmentRequired || d.riskAssessmentCompleted, {
    message:
      "You said a risk assessment is required, so it has to be completed before submitting.",
    path: ["riskAssessmentCompleted"],
  })
  .refine((d) => !d.riskAssessmentRequired || d.precautions.length >= 10, {
    message: "Describe the precautions taken.",
    path: ["precautions"],
  });

/** Drafts save whatever has been typed; projectSchema is applied on submit. */
export const projectDraftSchema = projectObject
  .extend({
    title: z.string().trim(),
    focus: z.string().trim(),
    fromDate: z.coerce.date().nullish(),
    toDate: z.coerce.date().nullish(),
    strands: z.array(z.enum(STRANDS)),
    investigation: z.string().trim(),
    planning: z.string().trim(),
    action: z.string().trim(),
    reflection: z.string().trim(),
    contactEmail: z.string().trim(),
    planningDocUrl: z.string().trim(),
    enrollmentFormUrl: z.string().trim(),
  })
  .partial();

export const timelineSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(10, "Say what happened, in a sentence or two."),
  image: z.string().trim().min(1, "Every timeline entry needs a photo."),
  imageWidth: z.number().int().positive().nullish(),
  imageHeight: z.number().int().positive().nullish(),
});

export const projectReviewSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    /** "proposal" is the sign-off to start; "completion" is the sign-off to finish. */
    stage: z.enum(["proposal", "completion"]).default("proposal"),
    comment: z.string().trim().default(""),
  })
  .refine((d) => d.action === "approve" || d.comment.length >= 5, {
    message: "Tell the students what needs to change before rejecting.",
    path: ["comment"],
  });

export const firstIssue = (error: z.ZodError) => error.issues[0].message;

/**
 * Keeps only the fields the caller actually sent.
 *
 * A `.partial()` schema still applies any `.default()` on a missing field, so
 * parsing `{ budget: "x" }` hands back every other defaulted field as well.
 * Writing that straight to Mongo would blank out whatever was stored. Partial
 * saves must touch nothing but what was submitted.
 */
export function onlySubmitted<T extends object>(raw: unknown, parsed: T): Partial<T> {
  if (typeof raw !== "object" || raw === null) return parsed;
  const sent = new Set(Object.keys(raw));
  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => sent.has(key)),
  ) as Partial<T>;
}
