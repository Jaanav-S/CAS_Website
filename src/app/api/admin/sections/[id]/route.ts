import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { User } from "@/models/User";
import { Experience } from "@/models/Experience";
import { firstIssue } from "@/lib/validation";
import { academicYearLabel } from "@/lib/cohort";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.object({
  name: z.string().trim().min(1).optional(),
  // The graduating year is the one knob; DP year and academic year derive from
  // it. Bounds keep an obvious typo from creating a nonsense cohort.
  gradYear: z.number().int().min(2000).max(2100).optional(),
  teachers: z.array(objectId).optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/sections/[id]">,
) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();
  const { id } = await ctx.params;
  const before = await Section.findById(id);
  if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const previousTeachers = (before.teachers ?? []).map(String);

  // Keep the legacy `year` key (which the unique index rides on) in step with
  // any change to the graduating year.
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.gradYear !== undefined) {
    update.year = academicYearLabel(parsed.data.gradYear - 2);
  }

  const section = await Section.findByIdAndUpdate(id, update, { new: true });
  if (!section) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Mirror the assignment onto the teachers themselves, so the Section column
  // on the Users page agrees with who can actually review this section.
  if (parsed.data.teachers) {
    const now = parsed.data.teachers;
    const added = now.filter((t) => !previousTeachers.includes(t));
    const removed = previousTeachers.filter((t) => !now.includes(t));

    if (added.length) {
      await User.updateMany(
        { _id: { $in: added }, $or: [{ section: null }, { section: { $exists: false } }] },
        { section: section._id },
      );
    }
    if (removed.length) {
      await User.updateMany(
        { _id: { $in: removed }, section: section._id },
        { section: null },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/admin/sections/[id]">,
) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  await dbConnect();

  const members = await User.countDocuments({ section: id });
  if (members > 0) {
    return NextResponse.json(
      {
        error: `Move the ${members} member(s) out of this section before deleting it.`,
      },
      { status: 409 },
    );
  }

  await Experience.updateMany({ section: id }, { section: null });
  await Section.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
