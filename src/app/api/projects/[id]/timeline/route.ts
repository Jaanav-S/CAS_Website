import { Types } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { CasProject } from "@/models/CasProject";
import { canAddTimeline, isProjectMember } from "@/lib/projects";
import { firstIssue, timelineSchema } from "@/lib/validation";

/** Timeline entries open up once both approvers have signed the project off. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/timeline">,
) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  await dbConnect();
  const project = await CasProject.findById(id);

  if (!project || !isProjectMember(project, user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!canAddTimeline(project)) {
    const stage = project.completion?.status ?? "none";
    return NextResponse.json(
      {
        error:
          stage === "pending"
            ? "The timeline is locked while your approvers look at the finished project."
            : stage === "approved"
              ? "This project is finished and published, so the timeline is closed."
              : "The timeline opens once your teacher and CAS supervisor have both approved the project.",
      },
      { status: 409 },
    );
  }

  const parsed = timelineSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  project.timeline.push({
    ...parsed.data,
    imageWidth: parsed.data.imageWidth ?? undefined,
    imageHeight: parsed.data.imageHeight ?? undefined,
    addedBy: new Types.ObjectId(user.id),
    addedByName: user.name,
    createdAt: new Date(),
  });
  await project.save();

  return NextResponse.json({ ok: true, entries: project.timeline.length });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/timeline">,
) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const entryId = request.nextUrl.searchParams.get("entry");
  if (!entryId) {
    return NextResponse.json({ error: "Which entry?" }, { status: 400 });
  }

  const { id } = await ctx.params;
  await dbConnect();
  const project = await CasProject.findById(id);
  if (!project || !isProjectMember(project, user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!canAddTimeline(project)) {
    return NextResponse.json(
      { error: "The timeline is locked at the moment." },
      { status: 409 },
    );
  }

  const entry = project.timeline.find((e) => String(e._id) === entryId);
  if (!entry) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // Only whoever wrote it can take it back out.
  if (String(entry.addedBy) !== user.id) {
    return NextResponse.json(
      { error: "You can only remove entries you added." },
      { status: 403 },
    );
  }

  project.timeline = project.timeline.filter((e) => String(e._id) !== entryId);
  await project.save();
  return NextResponse.json({ ok: true });
}
