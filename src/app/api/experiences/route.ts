import { NextResponse, type NextRequest } from "next/server";
import { apiUser, canSubmitWork } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { User, type UserDoc } from "@/models/User";
import { Section, type SectionDoc } from "@/models/Section";
import { firstIssue, proposalSchema } from "@/lib/validation";

/** Step 1: create the proposal. The experience stays a draft until the
 *  student has also written the reflection blog and submitted it. */
export async function POST(request: NextRequest) {
  const user = await apiUser("student");
  if (!user) {
    return NextResponse.json(
      { error: "Only students can create CAS experiences." },
      { status: 403 },
    );
  }

  if (!canSubmitWork(user)) {
    return NextResponse.json(
      { error: "Your CAS programme is complete, so new work can no longer be added." },
      { status: 403 },
    );
  }

  const parsed = proposalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();
  const student = await User.findById(user.id).lean<UserDoc>();

  // The DP year is copied from the section the student is in right now, so
  // this experience stays labelled DP1 even after they move up to DP2.
  const section = student?.section
    ? await Section.findById(student.section).lean<SectionDoc>()
    : null;

  const experience = await Experience.create({
    ...parsed.data,
    casAdvisor: parsed.data.casAdvisor || null,
    student: user.id,
    section: student?.section ?? null,
    dpYear: section?.dpYear ?? null,
    status: "draft",
  });

  return NextResponse.json({ id: String(experience._id) }, { status: 201 });
}
