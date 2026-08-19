import { NextResponse, type NextRequest } from "next/server";
import { apiUser, canSubmitWork } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import { blogSchema, firstIssue, proposalSchema } from "@/lib/validation";

/** Step 2 complete: send the reflection to the section teacher for review. */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/experiences/[id]/submit">,
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

  // Drafts are allowed to be incomplete while they are being autosaved, so
  // both steps are validated in full here, at the point of no return.
  const proposal = proposalSchema.safeParse({
    year: experience.year ?? "",
    term: experience.term,
    title: experience.title ?? "",
    description: experience.description ?? "",
    strands: experience.strands ?? [],
    location: experience.location,
    fromDate: experience.fromDate,
    toDate: experience.toDate,
    learningOutcomes: experience.learningOutcomes ?? [],
    sdgs: experience.sdgs ?? [],
    investigation: experience.investigation ?? "",
    learnerProfileAttributes: experience.learnerProfileAttributes ?? [],
    learnerProfileNote: experience.learnerProfileNote ?? "",
    supervisor: experience.supervisor ?? "",
    casAdvisor: experience.casAdvisor ? String(experience.casAdvisor) : null,
    stage: experience.stage,
  });
  if (!proposal.success) {
    return NextResponse.json(
      { error: `Your proposal form is incomplete — ${firstIssue(proposal.error)}` },
      { status: 400 },
    );
  }

  const parsed = blogSchema.safeParse({
    blogTitle: experience.blogTitle ?? "",
    blogBody: experience.blogBody ?? "",
    headerImage: experience.headerImage ?? "",
    headerWidth: experience.headerWidth ?? null,
    headerHeight: experience.headerHeight ?? null,
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
