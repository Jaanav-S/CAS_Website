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
  /** The student's section right now, which may have moved on since. */
  studentSectionId?: string | null,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role !== "teacher") return false;

  const candidates = [experienceSectionId, studentSectionId]
    .filter(Boolean)
    .map(String);
  if (candidates.length === 0) return false;

  // Either the teacher who was responsible when it was written, or the one
  // responsible for the student now — a DP1 post stays moderatable by the DP1
  // teacher, and the DP2 teacher can act on their current student too.
  const sections = (await teacherSectionIds(user.id)).map(String);
  return candidates.some((id) => sections.includes(id));
}
