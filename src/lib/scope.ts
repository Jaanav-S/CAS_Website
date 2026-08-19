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
