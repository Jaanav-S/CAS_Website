import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Experience } from "@/models/Experience";
import {
  blogDraftSchema,
  firstIssue,
  proposalDraftSchema,
  proposalSchema,
} from "@/lib/validation";

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
  const autosave = body.autosave === true;
  let update: Record<string, unknown>;

  if (body.step === "proposal") {
    // Autosaves accept a half-finished form; an explicit save does not.
    const schema = autosave ? proposalDraftSchema : proposalSchema;
    const parsed = schema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    update = { ...parsed.data };
    if ("casAdvisor" in update) update.casAdvisor = update.casAdvisor || null;
  } else if (body.step === "blog") {
    // Draft writes are lenient in both directions — "Save draft" and autosave
    // must both accept a reflection that is only half written.
    const parsed = blogDraftSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    update = { ...parsed.data };
  } else {
    return NextResponse.json({ error: "Unknown step." }, { status: 400 });
  }

  // Written with $set rather than save() so an incomplete draft is storable —
  // the schema's required fields are re-checked when the student submits.
  await Experience.updateOne({ _id: experience._id }, { $set: update });

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
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
