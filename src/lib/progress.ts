import { LO_IDS, REQUIREMENTS, STRANDS } from "@/lib/constants";

export type ProgressInput = {
  strands: string[];
  learningOutcomes: string[];
};

export type Progress = {
  approvedCount: number;
  totalRequired: number;
  strandCounts: Record<string, number>;
  loCounts: Record<string, number>;
  strandsMet: boolean;
  outcomesMet: boolean;
  totalMet: boolean;
  complete: boolean;
  /** 0-100, weighted across every individual requirement unit. */
  percent: number;
};

/**
 * Progress is only ever computed from *approved* experiences — a pending or
 * rejected reflection does not count towards completion.
 */
export function computeProgress(approved: ProgressInput[]): Progress {
  const strandCounts: Record<string, number> = Object.fromEntries(
    STRANDS.map((s) => [s, 0]),
  );
  const loCounts: Record<string, number> = Object.fromEntries(
    LO_IDS.map((lo) => [lo, 0]),
  );

  for (const exp of approved) {
    for (const strand of exp.strands ?? []) {
      if (strand in strandCounts) strandCounts[strand] += 1;
    }
    // An experience evidences each of its outcomes once, even if it is
    // listed under several strands.
    for (const lo of new Set(exp.learningOutcomes ?? [])) {
      if (lo in loCounts) loCounts[lo] += 1;
    }
  }

  const approvedCount = approved.length;
  const totalMet = approvedCount >= REQUIREMENTS.totalExperiences;
  const strandsMet = STRANDS.every(
    (s) => strandCounts[s] >= REQUIREMENTS.perStrand,
  );
  const outcomesMet = LO_IDS.every(
    (lo) => loCounts[lo] >= REQUIREMENTS.perLearningOutcome,
  );

  const earned =
    Math.min(approvedCount, REQUIREMENTS.totalExperiences) +
    STRANDS.reduce(
      (sum, s) => sum + Math.min(strandCounts[s], REQUIREMENTS.perStrand),
      0,
    ) +
    LO_IDS.reduce(
      (sum, lo) => sum + Math.min(loCounts[lo], REQUIREMENTS.perLearningOutcome),
      0,
    );
  const target =
    REQUIREMENTS.totalExperiences +
    STRANDS.length * REQUIREMENTS.perStrand +
    LO_IDS.length * REQUIREMENTS.perLearningOutcome;

  return {
    approvedCount,
    totalRequired: REQUIREMENTS.totalExperiences,
    strandCounts,
    loCounts,
    strandsMet,
    outcomesMet,
    totalMet,
    complete: totalMet && strandsMet && outcomesMet,
    percent: Math.round((earned / target) * 100),
  };
}
