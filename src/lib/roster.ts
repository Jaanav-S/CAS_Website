import type mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Experience } from "@/models/Experience";
import { CasProject } from "@/models/CasProject";
import { computeProgress, type Progress, type ProgressInput } from "@/lib/progress";

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

  // Finished (published) CAS projects count as approved experiences too, for the
  // owner and every member alike.
  const studentIds = students.map((s) => s._id);
  const projects = await CasProject.find({
    $or: [{ owner: { $in: studentIds } }, { members: { $in: studentIds } }],
    "completion.status": "approved",
  })
    .select("owner members strands")
    .lean<
      {
        owner: mongoose.Types.ObjectId;
        members: mongoose.Types.ObjectId[];
        strands: string[];
      }[]
    >();

  const projectsByStudent = new Map<string, ProgressInput[]>();
  for (const p of projects) {
    const item: ProgressInput = { strands: p.strands ?? [], learningOutcomes: [] };
    const participants = new Set([String(p.owner), ...(p.members ?? []).map(String)]);
    for (const sid of participants) {
      const list = projectsByStudent.get(sid);
      if (list) list.push(item);
      else projectsByStudent.set(sid, [item]);
    }
  }

  return students.map((student) => {
    const own = byStudent.get(String(student._id)) ?? [];
    const projectItems = projectsByStudent.get(String(student._id)) ?? [];
    return {
      id: String(student._id),
      name: student.name,
      email: student.email,
      image: student.image,
      sectionId: student.section ? String(student.section) : null,
      progress: computeProgress([
        ...own.filter((e) => e.status === "approved"),
        ...projectItems,
      ]),
      pending: own.filter((e) => e.status === "pending").length,
      rejected: own.filter((e) => e.status === "rejected").length,
      drafts: own.filter((e) => e.status === "draft").length,
    };
  });
}
