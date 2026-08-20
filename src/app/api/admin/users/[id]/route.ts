import { Types } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser, isAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Experience } from "@/models/Experience";
import { moveStudentToSection } from "@/lib/promotion";
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
  if (id === admin.id && parsed.data.role && parsed.data.role !== admin.role) {
    return NextResponse.json(
      { error: "You cannot change your own role." },
      { status: 400 },
    );
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // The admin/coordinator tier can only be granted or removed by a full admin
  // (or the maintainer). A coordinator manages students, teachers and
  // supervisors, and cannot touch anyone who is already admin or coordinator.
  if (!isAdmin(admin)) {
    const senior = (r: string) => r === "admin" || r === "coordinator";
    if (parsed.data.role && senior(parsed.data.role)) {
      return NextResponse.json(
        { error: "Only an admin can grant the admin or coordinator role." },
        { status: 403 },
      );
    }
    if (senior(user.role)) {
      return NextResponse.json(
        { error: "Only an admin can change an admin or coordinator account." },
        { status: 403 },
      );
    }
  }

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

    // Shared with the end-of-year batch tool, so a single move and a bulk move
    // treat a student's history identically.
    if (user.role === "student") {
      await moveStudentToSection(user, sectionId, section);
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
  const target = await User.findById(id).select("role").lean<{ role: string }>();
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // A coordinator cannot delete an admin or another coordinator.
  if (!isAdmin(admin) && (target.role === "admin" || target.role === "coordinator")) {
    return NextResponse.json(
      { error: "Only an admin can delete an admin or coordinator account." },
      { status: 403 },
    );
  }

  await Experience.deleteMany({ student: id });
  await Section.updateMany({ teachers: id }, { $pull: { teachers: id } });
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
