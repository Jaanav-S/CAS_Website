import { Types } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Experience } from "@/models/Experience";
import { Section } from "@/models/Section";
import { ACCOUNT_STATUSES, ROLES } from "@/lib/constants";
import { firstIssue } from "@/lib/validation";

const schema = z.object({
  status: z.enum(ACCOUNT_STATUSES).optional(),
  role: z.enum(ROLES).optional(),
  section: z.union([z.string().regex(/^[0-9a-fA-F]{24}$/), z.literal("")]).optional(),
  graduated: z.boolean().optional(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/users/[id]">,
) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { id } = await ctx.params;
  if (id === admin.id && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json(
      { error: "You cannot remove your own admin role." },
      { status: 400 },
    );
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const previousRole = user.role;
  const previousSection = user.section ? String(user.section) : null;

  if (parsed.data.status) user.status = parsed.data.status;
  if (parsed.data.role) user.role = parsed.data.role;
  if (parsed.data.graduated !== undefined) user.graduated = parsed.data.graduated;
  if (parsed.data.rejectionReason !== undefined) {
    user.rejectionReason = parsed.data.rejectionReason;
  }

  if (parsed.data.section !== undefined) {
    const sectionId = parsed.data.section || null;
    const section = sectionId ? await Section.findById(sectionId) : null;
    if (sectionId && !section) {
      return NextResponse.json({ error: "Unknown section." }, { status: 400 });
    }
    user.section = sectionId ? new Types.ObjectId(sectionId) : null;

    // Moving a student on — DP1 to DP2, say — hands their *unfinished* work to
    // the new section's teachers. Approved experiences keep the section and DP
    // year they were earned under, so the record of what happened in DP1 stays
    // accurate no matter how many times the student is moved afterwards.
    if (user.role === "student") {
      await Experience.updateMany(
        { student: user._id, status: { $in: ["draft", "pending", "rejected"] } },
        { section: sectionId, dpYear: section?.dpYear ?? null },
      );
    }
  }

  // Section.teachers is what actually grants review access, so putting a
  // teacher into a section here has to update it too — otherwise the section
  // shows on their profile but their students never reach the review queue.
  if (user.role === "teacher") {
    if (previousSection && previousSection !== String(user.section ?? "")) {
      await Section.updateOne(
        { _id: previousSection },
        { $pull: { teachers: user._id } },
      );
    }
    if (user.section) {
      await Section.updateOne(
        { _id: user.section },
        { $addToSet: { teachers: user._id } },
      );
    }
  } else if (previousRole === "teacher") {
    // No longer a teacher: they must not keep reviewing anybody.
    await Section.updateMany(
      { teachers: user._id },
      { $pull: { teachers: user._id } },
    );
  }

  await user.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/admin/users/[id]">,
) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  await dbConnect();
  await Experience.deleteMany({ student: id });
  await Section.updateMany({ teachers: id }, { $pull: { teachers: id } });
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
