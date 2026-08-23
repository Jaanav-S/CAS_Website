import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { Section, type SectionDoc } from "@/models/Section";
import { User, type UserDoc } from "@/models/User";
import { describeSection } from "@/lib/cohort";

/** Work that still needs a teacher, and so follows a student when they move. */
const IN_FLIGHT = ["draft", "pending", "rejected"] as const;

/**
 * Moves one student into a section.
 *
 * Approved experiences deliberately keep the section and DP year they were
 * earned under, so the DP1 record stays attributed to the DP1 class. Only
 * unfinished work follows the student to their new teachers.
 *
 * Used by both the single-student admin edit and the end-of-year batch tool so
 * the two can never drift apart.
 */
export async function moveStudentToSection(
  student: UserDoc & { save?: () => Promise<unknown> },
  sectionId: string | null,
  section?: SectionDoc | null,
): Promise<void> {
  await dbConnect();

  const target =
    section ?? (sectionId ? await Section.findById(sectionId).lean<SectionDoc>() : null);

  await User.updateOne(
    { _id: student._id },
    { section: sectionId ? new mongoose.Types.ObjectId(sectionId) : null },
  );

  await Experience.updateMany(
    { student: student._id, status: { $in: [...IN_FLIGHT] } },
    { section: sectionId, dpYear: target ? describeSection(target).dpYear : null },
  );
}

export type PromotionOverview = {
  /**
   * Approved, not-yet-graduated students whose section is in its DP2 year — the
   * cohort that is finishing and can be graduated. Moving DP1 up to DP2 no
   * longer needs a step: a section becomes DP2 on its own when the year rolls.
   */
  graduating: { id: string; name: string; section: string }[];
};

/** Everything the end-of-year panel needs. */
export async function promotionOverview(): Promise<PromotionOverview> {
  await dbConnect();

  const sections = await Section.find().lean();
  const byId = new Map(sections.map((s) => [String(s._id), s]));
  const dp2Ids = sections
    .filter((s) => describeSection(s).stage === "DP2")
    .map((s) => s._id);

  const dp2Members = await User.find({
    role: "student",
    status: "approved",
    graduated: { $ne: true },
    section: { $in: dp2Ids },
  })
    .select("name section")
    .sort({ name: 1 })
    .lean<{ _id: unknown; name: string; section: unknown }[]>();

  const label = (id: unknown) => {
    const s = byId.get(String(id));
    return s ? `${s.name} · ${describeSection(s).academicYear}` : "No section";
  };

  return {
    graduating: dp2Members.map((u) => ({
      id: String(u._id),
      name: u.name,
      section: label(u.section),
    })),
  };
}
