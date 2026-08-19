import type mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Experience } from "@/models/Experience";
import { computeProgress, type Progress } from "@/lib/progress";

export type RosterRow = {
  id: string;
  name: string;
  email: string;
  image?: string;
  sectionId: string | null;
  progress: Progress;
  pending: number;
  rejected: number;
  drafts: number;
};

/**
 * Builds the class overview: every approved student in the given sections,
 * with their progress and how much of their work is waiting on a teacher.
 * Two queries total, grouped in memory, rather than one query per student.
 */
export async function roster(
  sectionIds: (string | mongoose.Types.ObjectId)[],
): Promise<RosterRow[]> {
  await dbConnect();

  const students = await User.find({
    role: "student",
    status: "approved",
    graduated: { $ne: true },
    section: { $in: sectionIds },
  })
    .select("name email image section")
    .sort({ name: 1 })
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        name: string;
        email: string;
        image?: string;
        section?: mongoose.Types.ObjectId | null;
      }[]
    >();

  if (students.length === 0) return [];

  const experiences = await Experience.find({
    student: { $in: students.map((s) => s._id) },
  })
    .select("student strands learningOutcomes status")
    .lean<
      {
        student: mongoose.Types.ObjectId;
        strands: string[];
        learningOutcomes: string[];
        status: string;
      }[]
    >();

  const byStudent = new Map<string, typeof experiences>();
  for (const exp of experiences) {
    const key = String(exp.student);
    const list = byStudent.get(key);
    if (list) list.push(exp);
    else byStudent.set(key, [exp]);
  }

  return students.map((student) => {
    const own = byStudent.get(String(student._id)) ?? [];
    return {
      id: String(student._id),
      name: student.name,
      email: student.email,
      image: student.image,
      sectionId: student.section ? String(student.section) : null,
      progress: computeProgress(own.filter((e) => e.status === "approved")),
      pending: own.filter((e) => e.status === "pending").length,
      rejected: own.filter((e) => e.status === "rejected").length,
      drafts: own.filter((e) => e.status === "draft").length,
    };
  });
}
