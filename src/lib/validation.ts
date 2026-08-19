import { z } from "zod";
import {
  EXPERIENCE_STAGES,
  LEARNER_PROFILE,
  LOCATIONS,
  LO_IDS,
  STRANDS,
  TERMS,
} from "@/lib/constants";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/** Step 1 — the CAS experience proposal form. */
export const proposalSchema = z
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
  })
  .refine((data) => data.toDate >= data.fromDate, {
    message: "The end date cannot be before the start date.",
    path: ["toDate"],
  });

export type ProposalInput = z.infer<typeof proposalSchema>;

/** Step 2 — the reflection blog. A header image is required. */
export const blogSchema = z.object({
  blogTitle: z.string().trim().min(3, "Give your reflection a title."),
  blogBody: z
    .string()
    .trim()
    .min(100, "Write at least 100 characters about your experience."),
  headerImage: z.string().trim().min(1, "A header image is required."),
  images: z.array(z.string().trim()).default([]),
});

export const reviewSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    comment: z.string().trim().default(""),
  })
  .refine((d) => d.action === "approve" || d.comment.length >= 5, {
    message: "Tell the student what needs to change before rejecting.",
    path: ["comment"],
  });

export const firstIssue = (error: z.ZodError) => error.issues[0].message;
