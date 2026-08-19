import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { blogSchema, firstIssue, proposalSchema } from "@/lib/validation";

/**
 * Students may edit their own experience while it is a draft or after it has
 * been rejected. Once it is pending or approved it is locked.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/experiences/[id]">,
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
      { error: "This experience is locked while it is under review." },
      { status: 409 },
    );
  }

  const body = await request.json();

  if (body.step === "proposal") {
    const parsed = proposalSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    experience.set({
      ...parsed.data,
      casAdvisor: parsed.data.casAdvisor || null,
    });
  } else if (body.step === "blog") {
    // Partial saves are allowed here; completeness is enforced on submit.
    const parsed = blogSchema.partial().safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    experience.set(parsed.data);
  } else {
    return NextResponse.json({ error: "Unknown step." }, { status: 400 });
  }

  await experience.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/experiences/[id]">,
) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  await dbConnect();
  const experience = await Experience.findById(id);

  if (!experience || String(experience.student) !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (experience.status !== "draft" && experience.status !== "rejected") {
    return NextResponse.json(
      { error: "Only drafts and rejected experiences can be deleted." },
      { status: 409 },
    );
  }

  await experience.deleteOne();
  return NextResponse.json({ ok: true });
}
