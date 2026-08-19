import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { User } from "@/models/User";
import { Experience } from "@/models/Experience";
import { firstIssue } from "@/lib/validation";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.object({
  name: z.string().trim().min(1).optional(),
  year: z.string().trim().min(4).optional(),
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
  const section = await Section.findByIdAndUpdate(
    (await ctx.params).id,
    parsed.data,
    { new: true },
  );
  if (!section) return NextResponse.json({ error: "Not found." }, { status: 404 });
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
