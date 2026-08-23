import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section, type SectionDoc } from "@/models/Section";
import { User, type UserDoc } from "@/models/User";
import { moveStudentToSection } from "@/lib/promotion";
import { firstIssue } from "@/lib/validation";
import { nextAcademicYear } from "@/lib/constants";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("graduate"),
    /** Explicit list, taken from what the admin was actually shown. */
    studentIds: z.array(objectId).min(1, "Select at least one student."),
  }),
  z.object({
    action: z.literal("assign"),
    assignments: z
      .array(
        z.object({
          sectionId: objectId,
          studentIds: z.array(objectId),
        }),
      )
      .min(1, "Nothing to assign."),
  }),
  // Roll every section on to the next academic year (2026-27 → 2027-28). Run
  // once at end of year, so the whole school moves up together.
  z.object({ action: z.literal("advance-year") }),
]);

/** End-of-year batch operations: graduate a cohort, move the next one up. */
export async function POST(request: NextRequest) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();

  if (parsed.data.action === "graduate") {
    // Restricted to students so a mis-sent id cannot graduate a teacher.
    const result = await User.updateMany(
      { _id: { $in: parsed.data.studentIds }, role: "student" },
      { graduated: true },
    );
    return NextResponse.json({ graduated: result.modifiedCount });
  }

  if (parsed.data.action === "advance-year") {
    // Every section moves on one academic year at once, so DP1 sections are
    // ready for the new intake and DP2 sections show the year the promoted
    // cohort is actually in.
    const sections = await Section.find().select("year").lean<SectionDoc[]>();
    const ops = sections
      .map((s) => ({ id: s._id, year: nextAcademicYear(s.year) }))
      .filter((o) => o.year !== undefined)
      .map((o) => ({
        updateOne: { filter: { _id: o.id }, update: { year: o.year } },
      }));
    if (ops.length > 0) await Section.bulkWrite(ops);
    return NextResponse.json({ advanced: ops.length });
  }

  const { assignments } = parsed.data;

  // A student appearing under two sections would be assigned twice, with the
  // last write silently winning — better to refuse and let the admin fix it.
  const seen = new Set<string>();
  for (const group of assignments) {
    for (const id of group.studentIds) {
      if (seen.has(id)) {
        return NextResponse.json(
          { error: "A student is listed under more than one section." },
          { status: 400 },
        );
      }
      seen.add(id);
    }
  }

  const sectionIds = assignments.map((a) => a.sectionId);
  const sections = await Section.find({ _id: { $in: sectionIds } }).lean<SectionDoc[]>();
  const byId = new Map(sections.map((s) => [String(s._id), s]));
  if (sections.length !== new Set(sectionIds).size) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  let moved = 0;
  for (const group of assignments) {
    if (group.studentIds.length === 0) continue;
    const section = byId.get(group.sectionId)!;

    const students = await User.find({
      _id: { $in: group.studentIds },
      role: "student",
    }).lean<UserDoc[]>();

    for (const student of students) {
      await moveStudentToSection(student, group.sectionId, section);
      moved += 1;
    }
  }

  return NextResponse.json({ moved });
}
