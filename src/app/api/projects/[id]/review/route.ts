import { Types } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { CasProject, overallStatus } from "@/models/CasProject";
import { approverRole } from "@/lib/projects";
import { firstIssue, projectReviewSchema } from "@/lib/validation";

/**
 * Each approver signs off their own half. The project only becomes approved
 * once both the section teacher and a CAS supervisor have said yes.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/review">,
) {
  const user = await apiUser("teacher", "supervisor", "admin");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = projectReviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { id } = await ctx.params;
  await dbConnect();
  const project = await CasProject.findById(id);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const role = await approverRole(project, user);
  if (!role) {
    return NextResponse.json(
      { error: "You are not an approver for this project." },
      { status: 403 },
    );
  }

  if (project.status !== "pending") {
    return NextResponse.json(
      { error: "This project is not awaiting approval." },
      { status: 409 },
    );
  }

  const decision = {
    status: parsed.data.action === "approve" ? ("approved" as const) : ("rejected" as const),
    by: new Types.ObjectId(user.id),
    byName: user.name,
    comment: parsed.data.comment,
    at: new Date(),
  };

  if (role === "teacher") project.teacherApproval = decision;
  else project.supervisorApproval = decision;

  project.status = overallStatus(project.teacherApproval, project.supervisorApproval);
  await project.save();

  return NextResponse.json({ status: project.status, as: role });
}
