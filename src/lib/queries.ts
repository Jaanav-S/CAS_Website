import { dbConnect } from "@/lib/db";
import { Experience, type ExperienceDoc } from "@/models/Experience";
import { computeProgress, type Progress } from "@/lib/progress";
import { plain } from "@/lib/serialize";

export type ExperienceListItem = Pick<
  ExperienceDoc,
  | "_id"
  | "title"
  | "strands"
  | "learningOutcomes"
  | "status"
  | "term"
  | "year"
  | "fromDate"
  | "toDate"
  | "headerImage"
  | "blogTitle"
  | "submittedAt"
  | "updatedAt"
  | "reviewNotes"
>;

const LIST_FIELDS =
  "title strands learningOutcomes status term year fromDate toDate headerImage blogTitle submittedAt updatedAt reviewNotes";

export async function studentExperiences(
  studentId: string,
): Promise<ExperienceListItem[]> {
  await dbConnect();
  const docs = await Experience.find({ student: studentId })
    .select(LIST_FIELDS)
    .sort({ updatedAt: -1 })
    .lean<ExperienceListItem[]>();
  return plain(docs);
}

export async function studentProgress(studentId: string): Promise<Progress> {
  await dbConnect();
  const approved = await Experience.find({
    student: studentId,
    status: "approved",
  })
    .select("strands learningOutcomes")
    .lean<{ strands: string[]; learningOutcomes: string[] }[]>();
  return computeProgress(approved);
}

/** Counts by review status for a set of students (or everyone). */
export async function statusCounts(filter: Record<string, unknown> = {}) {
  await dbConnect();
  const rows = await Experience.aggregate<{ _id: string; count: number }>([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = { draft: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of rows) {
    if (row._id in counts) counts[row._id as keyof typeof counts] = row.count;
  }
  return counts;
}

/**
 * CAS advisors offered in the proposal form: the teachers assigned to the
 * student's own section, falling back to every teacher if none are yet.
 */
export async function advisorOptions(
  sectionId: string | null,
): Promise<{ id: string; name: string }[]> {
  await dbConnect();
  const { User } = await import("@/models/User");
  const { Section } = await import("@/models/Section");

  if (sectionId) {
    const section = await Section.findById(sectionId)
      .populate<{ teachers: { _id: unknown; name: string }[] }>(
        "teachers",
        "name",
      )
      .lean();
    const teachers = section?.teachers ?? [];
    if (teachers.length > 0) {
      return teachers.map((t) => ({ id: String(t._id), name: t.name }));
    }
  }

  const all = await User.find({ role: "teacher", status: "approved" })
    .select("name")
    .sort({ name: 1 })
    .lean<{ _id: unknown; name: string }[]>();
  return all.map((t) => ({ id: String(t._id), name: t.name }));
}

export type PopulatedPerson = {
  _id: string;
  name: string;
  image?: string;
  section?: string | null;
  graduated?: boolean;
};

export type ExperienceDetail = Omit<
  ExperienceDoc,
  "_id" | "student" | "casAdvisor" | "section"
> & {
  _id: string;
  student: PopulatedPerson;
  casAdvisor: PopulatedPerson | null;
  section: { _id: string; name: string; year: string } | null;
};

/** One experience with its author, advisor and section resolved. */
export async function experienceDetail(
  id: string,
): Promise<ExperienceDetail | null> {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;

  const doc = await Experience.findById(id)
    .populate("student", "name image email section graduated")
    .populate("casAdvisor", "name")
    .populate("section", "name year")
    .lean();

  return doc ? plain(doc as unknown as ExperienceDetail) : null;
}
