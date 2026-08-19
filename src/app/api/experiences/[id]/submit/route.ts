import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { blogSchema, firstIssue } from "@/lib/validation";

/** Step 2 complete: send the reflection to the section teacher for review. */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/experiences/[id]/submit">,
) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  await dbConnect();
  const experience = await Experience.findById(id);

  if (!experience || String(experience.student) !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (experience.status === "pending" || experience.status === "approved") {
    return NextResponse.json(
      { error: "This experience has already been submitted." },
      { status: 409 },
    );
  }

  const parsed = blogSchema.safeParse({
    blogTitle: experience.blogTitle ?? "",
    blogBody: experience.blogBody ?? "",
    headerImage: experience.headerImage ?? "",
    images: experience.images ?? [],
  });
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  experience.status = "pending";
  experience.submittedAt = new Date();
  experience.reviewedAt = null;
  experience.reviewedBy = null;
  await experience.save();

  return NextResponse.json({ ok: true });
}
