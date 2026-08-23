import type { DpYear } from "@/lib/constants";

/**
 * Sections belong to a *cohort*, identified by the calendar year that cohort
 * finishes DP2 (its "graduating year"). Everything a section shows — whether it
 * is DP1 or DP2, and which academic year it is in — is DERIVED from that grad
 * year and today's date, so it rolls forward on its own every August. Nothing
 * has to be edited at the end of the year for a class to become DP2.
 *
 *   grad year G  →  DP1 in academic year (G-2), DP2 in (G-1), gone from G on.
 */

/** The calendar year the current academic year began (it rolls over 1 Aug). */
export function academicStartYear(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Format a start year as an academic-year label, e.g. 2026 → "2026-27". */
export function academicYearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export type CohortStage = "upcoming" | "DP1" | "DP2" | "graduated";

/** Where a cohort sits right now, given its graduating year. */
export function cohortStage(gradYear: number, now: Date = new Date()): CohortStage {
  const start = academicStartYear(now);
  if (start < gradYear - 2) return "upcoming";
  if (start === gradYear - 2) return "DP1";
  if (start === gradYear - 1) return "DP2";
  return "graduated";
}

/** The DP-year label a cohort currently carries, or null once it has left. */
export function cohortDpYear(gradYear: number, now: Date = new Date()): DpYear | null {
  const stage = cohortStage(gradYear, now);
  return stage === "DP1" || stage === "DP2" ? stage : null;
}

/**
 * The academic year the cohort is currently in, e.g. "2027-28". A cohort that
 * has not started yet shows its DP1 year; one that has left shows its DP2 year.
 */
export function cohortAcademicYear(gradYear: number, now: Date = new Date()): string {
  const stage = cohortStage(gradYear, now);
  const start =
    stage === "upcoming"
      ? gradYear - 2
      : stage === "graduated"
        ? gradYear - 1
        : academicStartYear(now);
  return academicYearLabel(start);
}

/** The graduating year for a brand-new section created now at the given stage. */
export function newSectionGradYear(dpYear: DpYear, now: Date = new Date()): number {
  return academicStartYear(now) + (dpYear === "DP2" ? 1 : 2);
}

/**
 * Older sections were stored as { year: "2026-27", dpYear: "DP1" } with no grad
 * year. Recover it so they behave exactly like new cohort sections. A DP1
 * section graduates two years after its start year, a DP2 one, one year after.
 */
export function legacyGradYear(year?: string | null, dpYear?: string | null): number {
  const start = Number.parseInt((year ?? "").slice(0, 4), 10);
  if (Number.isNaN(start)) return academicStartYear() + 2;
  return start + (dpYear === "DP2" ? 1 : 2);
}

/** Any shape carrying the fields we might read a grad year from. */
export type SectionLike = {
  year?: string | null;
  dpYear?: string | null;
  gradYear?: number | null;
};

/** The grad year of a section, preferring the stored value over the legacy one. */
export function sectionGradYear(section: SectionLike): number {
  return typeof section.gradYear === "number"
    ? section.gradYear
    : legacyGradYear(section.year, section.dpYear);
}

export type SectionDescription = {
  gradYear: number;
  stage: CohortStage;
  /** "DP1" | "DP2" while the cohort is active, else null. */
  dpYear: DpYear | null;
  /** e.g. "2027-28". */
  academicYear: string;
};

/** Everything the UI needs to show about a section, derived from its grad year. */
export function describeSection(
  section: SectionLike,
  now: Date = new Date(),
): SectionDescription {
  const gradYear = sectionGradYear(section);
  return {
    gradYear,
    stage: cohortStage(gradYear, now),
    dpYear: cohortDpYear(gradYear, now),
    academicYear: cohortAcademicYear(gradYear, now),
  };
}

/**
 * A one-line label for a section, e.g. "Prudence · 2027-28 (DP2)". Cohorts that
 * have left are shown as "· Graduated" instead of a DP year.
 */
export function sectionLabel(section: SectionLike & { name: string }, now: Date = new Date()): string {
  const { academicYear, dpYear, stage } = describeSection(section, now);
  const tail = dpYear ?? (stage === "graduated" ? "Graduated" : "Upcoming");
  return `${section.name} · ${academicYear} (${tail})`;
}
