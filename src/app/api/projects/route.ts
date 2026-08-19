import { NextResponse, type NextRequest } from "next/server";
import { apiUser, canSubmitWork } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { CasProject } from "@/models/CasProject";
import { User, type UserDoc } from "@/models/User";
import { resolveMembers } from "@/lib/projects";
import { firstIssue, projectDraftSchema } from "@/lib/validation";

/** Starts a CAS project as a draft; the details are filled in as they go. */
export async function POST(request: NextRequest) {
  const user = await apiUser("student");
  if (!user) {
    return NextResponse.json(
      { error: "Only students can start a CAS project." },
      { status: 403 },
    );
  }
  if (!canSubmitWork(user)) {
    return NextResponse.json(
      { error: "Your CAS programme is complete, so new work can no longer be added." },
      { status: 403 },
    );
  }

  const parsed = projectDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();
  const student = await User.findById(user.id).lean<UserDoc>();

  const { memberEmails = [], ...fields } = parsed.data;
  const checked = await resolveMembers(memberEmails, user.id);
  const bad = checked.find((c) => !c.ok);
  if (bad) {
    return NextResponse.json(
      { error: `${bad.email}: ${bad.reason}` },
      { status: 400 },
    );
  }

  // A draft may legitimately have no dates yet; Mongoose wants them absent
  // rather than null.
  const { fromDate, toDate, ...rest } = fields;
  const payload: Record<string, unknown> = {
    ...rest,
    casSupervisor: fields.casSupervisor || null,
    owner: user.id,
    members: checked.flatMap((c) => (c.id ? [c.id] : [])),
    section: student?.section ?? null,
    status: "draft",
  };
  if (fromDate) payload.fromDate = fromDate;
  if (toDate) payload.toDate = toDate;

  const created = await CasProject.create(payload);

  return NextResponse.json({ id: String(created._id) }, { status: 201 });
}
