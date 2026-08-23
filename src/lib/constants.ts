/**
 * Domain constants for the CAS programme.
 * Tweak REQUIREMENTS here if your school's thresholds differ.
 */

/** Shown in the header, on the sign-in pages and in the browser tab. */
export const SCHOOL_NAME = "Fountainhead School";

export const STRANDS = ["Creativity", "Activity", "Service"] as const;
export type Strand = (typeof STRANDS)[number];

export const LEARNING_OUTCOMES = [
  { id: "LO1", label: "Identify own strengths and develop areas for growth" },
  {
    id: "LO2",
    label:
      "Demonstrate that challenges have been undertaken, developing new skills",
  },
  { id: "LO3", label: "Initiate and plan a CAS experience" },
  { id: "LO4", label: "Show perseverance and commitment in CAS experience" },
  {
    id: "LO5",
    label: "Demonstrate skills and benefits of working collaboratively",
  },
  { id: "LO6", label: "Engagement with issues of global significance" },
  { id: "LO7", label: "Recognise and consider the ethics of choices and actions" },
] as const;

export const LO_IDS = LEARNING_OUTCOMES.map((lo) => lo.id);

export const SDGS = [
  { id: 1, label: "No Poverty" },
  { id: 2, label: "Zero Hunger" },
  { id: 3, label: "Good Health and Well-being" },
  { id: 4, label: "Quality Education" },
  { id: 5, label: "Gender Equality" },
  { id: 6, label: "Clean Water and Sanitation" },
  { id: 7, label: "Affordable and Clean Energy" },
  { id: 8, label: "Decent Work and Economic Growth" },
  { id: 9, label: "Industry, Innovation and Infrastructure" },
  { id: 10, label: "Reduced Inequalities" },
  { id: 11, label: "Sustainable Cities and Communities" },
  { id: 12, label: "Responsible Consumption and Production" },
  { id: 13, label: "Climate Action" },
  { id: 14, label: "Life Below Water" },
  { id: 15, label: "Life on Land" },
  { id: 16, label: "Peace, Justice and Strong Institutions" },
  { id: 17, label: "Partnerships for the Goals" },
] as const;

export const LEARNER_PROFILE = [
  "Inquirers",
  "Knowledgeable",
  "Thinkers",
  "Communicators",
  "Principled",
  "Open-minded",
  "Caring",
  "Risk-takers",
  "Balanced",
  "Reflective",
] as const;

export const TERMS = ["Term 1", "Term 2", "Term 3"] as const;

/**
 * Which year of the Diploma Programme a section belongs to. A student moves
 * from a DP1 section to a DP2 section on the same account, so this lives on
 * the section rather than the person.
 */
export const DP_YEARS = ["DP1", "DP2"] as const;
export type DpYear = (typeof DP_YEARS)[number];

export const LOCATIONS = ["In-school", "Out-of-school", "Both"] as const;

/** Status of the CAS experience itself (as opposed to its review status). */
export const EXPERIENCE_STAGES = ["Planned", "Ongoing", "Completed"] as const;

export const REVIEW_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const ROLES = ["student", "teacher", "supervisor", "coordinator", "admin"] as const;

/** Human labels for roles — "supervisor" is the CAS supervisor/coordinator. */
export const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  supervisor: "CAS supervisor",
  coordinator: "CAS Coordinator",
  admin: "Admin",
};
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["pending", "approved", "rejected"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** The four CAS stages a project is planned through. */
export const PROJECT_STAGES = [
  {
    key: "investigation",
    label: "Investigation",
    help: "Why did you select this, and what research or investigation have you done for this project?",
  },
  { key: "planning", label: "Preparation / Planning", help: "" },
  { key: "action", label: "Action", help: "" },
  { key: "reflection", label: "Reflection", help: "" },
] as const;

/**
 * The second approval round, once the students say the project is finished.
 * "none" means they have not marked it done yet.
 */
export const COMPLETION_STATUSES = ["none", "pending", "approved", "rejected"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

/** What Discovery is showing: individual reflections, or finished projects. */
export const DISCOVERY_KINDS = ["reflection", "project"] as const;
export type DiscoveryKind = (typeof DISCOVERY_KINDS)[number];

/** Both approvals must land before a project is signed off. */
export const PROJECT_APPROVERS = ["teacher", "supervisor"] as const;
export type ProjectApprover = (typeof PROJECT_APPROVERS)[number];

/** How many collaborators a project owner may add alongside themselves. */
export const MAX_PROJECT_MEMBERS = 6;

/** Graduation requirements checked on the student dashboard. */
export const REQUIREMENTS = {
  /** Total approved experiences needed. */
  totalExperiences: 8,
  /** Minimum approved experiences in each of Creativity / Activity / Service. */
  perStrand: 1,
  /** Each learning outcome must be evidenced at least this many times. */
  perLearningOutcome: 2,
};

/** Format a start year as an academic-year label, e.g. 2026 → "2026-27". */
export function academicYearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Academic years offered in the form dropdown, e.g. "2026-27". The window is
 * anchored to today (so it rolls forward every year) and runs from last year to
 * well into the future, so there is always plenty of headroom.
 */
export function academicYears(count = 12): string[] {
  const now = new Date();
  // An academic year starting in August rolls over to the next label.
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => academicYearLabel(startYear - 1 + i));
}

/** The academic year after the given one, e.g. "2026-27" → "2027-28". */
export function nextAcademicYear(year: string): string {
  const start = Number.parseInt(year.slice(0, 4), 10);
  return Number.isNaN(start) ? year : academicYearLabel(start + 1);
}

/**
 * The calendar year an academic year ends in — the year a DP2 cohort graduates.
 * e.g. "2027-28" → 2028. Falls back to the current calendar year.
 */
export function academicYearEnd(year: string): number {
  const start = Number.parseInt((year ?? "").slice(0, 4), 10);
  return Number.isNaN(start) ? new Date().getFullYear() : start + 1;
}
