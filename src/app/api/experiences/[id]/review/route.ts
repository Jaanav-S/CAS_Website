import { Types } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { User } from "@/models/User";
import { canModerate } from "@/lib/scope";
import { firstIssue, reviewSchema } from "@/lib/validation";

/** Teachers approve or reject reflections from their own section. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/experiences/[id]/review">,
) {
  const user = await apiUser("teacher", "admin");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { id } = await ctx.params;
  await dbConnect();
  const experience = await Experience.findById(id);
  if (!experience) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const author = await User.findById(experience.student).select("section").lean<{
    section?: unknown;
  }>();

  const allowed = await canModerate(
    user,
    experience.section ? String(experience.section) : null,
    author?.section ? String(author.section) : null,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "You can only review students in your own section." },
      { status: 403 },
    );
  }

  const { action, comment } = parsed.data;

  // A takedown pulls an already-published reflection back off Discovery; the
  // other two actions are the first pass over a fresh submission.
  if (action === "takedown") {
    if (experience.status !== "approved") {
      return NextResponse.json(
        { error: "Only a published reflection can be taken down." },
        { status: 409 },
      );
    }
  } else if (experience.status !== "pending") {
    return NextResponse.json(
      { error: "This experience is not awaiting review." },
      { status: 409 },
    );
  }

  experience.status = action === "approve" ? "approved" : "rejected";
  experience.reviewedAt = new Date();
  experience.reviewedBy = new Types.ObjectId(user.id);
  experience.reviewNotes.push({
    teacher: experience.reviewedBy,
    teacherName: user.name,
    action: action === "approve" ? "approved" : action === "takedown" ? "takedown" : "rejected",
    comment,
    createdAt: new Date(),
  });
  await experience.save();

  return NextResponse.json({ status: experience.status });
}
