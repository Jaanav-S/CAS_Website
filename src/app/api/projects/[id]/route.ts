import { NextResponse, type NextRequest } from "next/server";
import { apiUser, canSubmitWork } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { CasProject } from "@/models/CasProject";
import { canEditProject, isProjectMember, resolveMembers } from "@/lib/projects";
import { firstIssue, onlySubmitted, projectDraftSchema } from "@/lib/validation";

/**
 * Any member may edit, not just the owner — that is the point of adding
 * people. Editing closes once the project is with the approvers.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">,
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
  if (!canEditProject(project)) {
    return NextResponse.json(
      {
        error:
          project.completion?.status === "approved"
            ? "This project is finished and published, so it can no longer be changed."
            : "This project is locked while it is being approved.",
      },
      { status: 409 },
    );
  }

  const body = await request.json();
  const raw = body.data ?? body;
  // The schema fills in a default for memberEmails, so ask the request itself
  // whether the caller actually meant to change the member list.
  const changingMembers =
    typeof raw === "object" && raw !== null && "memberEmails" in raw;

  const parsed = projectDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { memberEmails, ...fields } = onlySubmitted(raw, parsed.data);
  const update: Record<string, unknown> = { ...fields };
  if ("casSupervisor" in update) update.casSupervisor = update.casSupervisor || null;

  // Only the owner decides who is on the project; a member cannot remove them.
  if (changingMembers && memberEmails !== undefined) {
    if (String(project.owner) !== user.id) {
      return NextResponse.json(
        { error: "Only the student who created the project can change its members." },
        { status: 403 },
      );
    }
    const checked = await resolveMembers(memberEmails, user.id);
    const bad = checked.find((c) => !c.ok);
    if (bad) {
      return NextResponse.json({ error: `${bad.email}: ${bad.reason}` }, { status: 400 });
    }
    update.members = checked.flatMap((c) => (c.id ? [c.id] : []));
  }

  // $set rather than save() so a half-finished draft is always storable.
  await CasProject.updateOne({ _id: project._id }, { $set: update });

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">,
) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  await dbConnect();
  const project = await CasProject.findById(id);

  if (!project || String(project.owner) !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.status !== "draft" && project.status !== "rejected") {
    return NextResponse.json(
      { error: "Only drafts and sent-back projects can be deleted." },
      { status: 409 },
    );
  }

  await project.deleteOne();
  return NextResponse.json({ ok: true });
}
