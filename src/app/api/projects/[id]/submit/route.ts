import { NextResponse, type NextRequest } from "next/server";
import { apiUser, canSubmitWork } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { CasProject } from "@/models/CasProject";
import { isProjectMember } from "@/lib/projects";
import { firstIssue, projectSchema } from "@/lib/validation";

/** Sends the project to both approvers at once. */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/submit">,
) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!canSubmitWork(user)) {
    return NextResponse.json(
      { error: "Your CAS programme is complete, so new work can no longer be added." },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  await dbConnect();
  const project = await CasProject.findById(id);

  if (!project || !isProjectMember(project, user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.status === "pending" || project.status === "approved") {
    return NextResponse.json(
      { error: "This project has already been submitted." },
      { status: 409 },
    );
  }

  // Drafts are deliberately lenient, so the full rules are checked here.
  const parsed = projectSchema.safeParse({
    title: project.title ?? "",
    focus: project.focus ?? "",
    fromDate: project.fromDate,
    toDate: project.toDate,
    casSupervisor: project.casSupervisor ? String(project.casSupervisor) : null,
    strands: project.strands ?? [],
    investigation: project.investigation ?? "",
    planning: project.planning ?? "",
    action: project.action ?? "",
    reflection: project.reflection ?? "",
    budget: project.budget ?? "",
    donationOrg: project.donationOrg ?? "",
    contactPerson: project.contactPerson ?? "",
    contactPhone: project.contactPhone ?? "",
    contactEmail: project.contactEmail ?? "",
    externalSupervisor: project.externalSupervisor ?? "",
    riskAssessmentRequired: project.riskAssessmentRequired ?? false,
    riskAssessmentCompleted: project.riskAssessmentCompleted ?? false,
    precautions: project.precautions ?? "",
    planningDocUrl: project.planningDocUrl ?? "",
    enrollmentFormUrl: project.enrollmentFormUrl ?? "",
    memberEmails: [],
  });
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  // A resubmission starts both approvals over.
  project.status = "pending";
  project.submittedAt = new Date();
  project.teacherApproval = { status: "pending", by: null, comment: "", at: null };
  project.supervisorApproval = { status: "pending", by: null, comment: "", at: null };
  await project.save();

  return NextResponse.json({ ok: true });
}
