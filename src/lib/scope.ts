import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";

/** The sections a teacher is assigned to — the only students they may review. */
export async function teacherSectionIds(
  teacherId: string,
): Promise<mongoose.Types.ObjectId[]> {
  await dbConnect();
  const sections = await Section.find({ teachers: teacherId })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId }[]>();
  return sections.map((s) => s._id);
}

/**
 * Who may pull a published reflection off Discovery: an admin for anybody, a
 * teacher only for their own sections.
 */
export async function canModerate(
  user: { id: string; role: string },
  experienceSectionId: string | null | undefined,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role !== "teacher" || !experienceSectionId) return false;
  const sections = (await teacherSectionIds(user.id)).map(String);
  return sections.includes(String(experienceSectionId));
}
