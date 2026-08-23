import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { Section, type SectionDoc } from "@/models/Section";
import { User, type UserDoc } from "@/models/User";

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
    { section: sectionId, dpYear: target?.dpYear ?? null },
  );
}

export type PromotionOverview = {
  dp2Sections: { id: string; name: string; year: string; teachers: string[] }[];
  /** Approved, not-yet-graduated students currently sitting in a DP2 section. */
  graduating: { id: string; name: string; section: string }[];
  /** Approved DP1 students who have not been moved up yet. */
  dp1Students: { id: string; name: string; section: string }[];
};

/** Everything the end-of-year panel needs, in three queries. */
export async function promotionOverview(): Promise<PromotionOverview> {
  await dbConnect();

  const sections = await Section.find()
    .populate<{ teachers: { name: string }[] }>("teachers", "name")
    .sort({ year: -1, name: 1 })
    .lean();

  const byId = new Map(sections.map((s) => [String(s._id), s]));
  const dp1Ids = sections.filter((s) => s.dpYear === "DP1").map((s) => s._id);
  const dp2Ids = sections.filter((s) => s.dpYear === "DP2").map((s) => s._id);

  const [dp2Members, dp1Members] = await Promise.all([
    User.find({
      role: "student",
      status: "approved",
      graduated: { $ne: true },
      section: { $in: dp2Ids },
    })
      .select("name section")
      .sort({ name: 1 })
      .lean<{ _id: unknown; name: string; section: unknown }[]>(),
    User.find({
      role: "student",
      status: "approved",
      graduated: { $ne: true },
      section: { $in: dp1Ids },
    })
      .select("name section")
      .sort({ name: 1 })
      .lean<{ _id: unknown; name: string; section: unknown }[]>(),
  ]);

  const label = (id: unknown) => {
    const s = byId.get(String(id));
    return s ? `${s.name} · ${s.year}` : "No section";
  };

  return {
    dp2Sections: sections
      .filter((s) => s.dpYear === "DP2")
      .map((s) => ({
        id: String(s._id),
        name: s.name,
        year: s.year,
        teachers: (s.teachers ?? []).map((t) => t.name),
      })),
    graduating: dp2Members.map((u) => ({
      id: String(u._id),
      name: u.name,
      section: label(u.section),
    })),
    dp1Students: dp1Members.map((u) => ({
      id: String(u._id),
      name: u.name,
      section: label(u.section),
    })),
  };
}
