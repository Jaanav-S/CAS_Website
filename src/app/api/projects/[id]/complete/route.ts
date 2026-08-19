import { NextResponse, type NextRequest } from "next/server";
import { apiUser, canSubmitWork } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { CasProject } from "@/models/CasProject";
import { isProjectMember } from "@/lib/projects";

/**
 * The students say the project is finished. It goes to the same two approvers
 * for a completion sign-off; once both agree, it is published to Discovery.
 *
 * On a resubmission after changes, only the approver who asked for them is put
 * back to pending — the other one's approval is left standing.
 */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/complete">,
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

  if (project.status !== "approved") {
    return NextResponse.json(
      { error: "The project has to be approved before you can mark it finished." },
      { status: 409 },
    );
  }

  const stage = project.completion?.status ?? "none";
  if (stage === "pending") {
    return NextResponse.json(
      { error: "This is already with your teacher and CAS supervisor." },
      { status: 409 },
    );
  }
  if (stage === "approved") {
    return NextResponse.json(
      { error: "This project is already finished and published." },
      { status: 409 },
    );
  }

  if (project.timeline.length === 0) {
    return NextResponse.json(
      { error: "Add at least one timeline entry before marking the project finished." },
      { status: 400 },
    );
  }

  // Anything still marked rejected goes back to pending; an approval that has
  // already been given stands, so that approver is not asked twice.
  for (const side of ["teacher", "supervisor"] as const) {
    if (project.completion[side].status !== "approved") {
      project.completion[side] = {
        status: "pending",
        by: null,
        byName: undefined,
        comment: "",
        at: null,
      };
    }
  }

  project.completion.status = "pending";
  project.completion.submittedAt = new Date();
  await project.save();

  return NextResponse.json({
    ok: true,
    awaiting: (["teacher", "supervisor"] as const).filter(
      (side) => project.completion[side].status === "pending",
    ),
  });
}
