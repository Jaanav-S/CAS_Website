import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Invite } from "@/models/Invite";
import { Section } from "@/models/Section";
import { inviteUrl, newToken } from "@/lib/invites";
import { firstIssue } from "@/lib/validation";

const schema = z
  .object({
    // Admins are deliberately not invitable by link; promote someone instead.
    role: z.enum(["student", "teacher", "supervisor"]),
    section: z
      .union([z.string().regex(/^[0-9a-fA-F]{24}$/), z.literal("")])
      .optional(),
    capacity: z
      .number()
      .int("Enter a whole number.")
      .min(1, "At least one person has to be able to use the link.")
      .max(500, "That is more people than this link should carry."),
    label: z.string().trim().max(120).default(""),
  })
  .refine((d) => d.role !== "student" || Boolean(d.section), {
    message: "A student link has to be tied to a section.",
    path: ["section"],
  });

/** Creates a sign-up link. Its capacity is what makes it expire. */
export async function POST(request: NextRequest) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();
  const sectionId = parsed.data.section || null;
  if (sectionId && !(await Section.findById(sectionId))) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  const token = newToken();
  await Invite.create({
    token,
    role: parsed.data.role,
    // A CAS supervisor belongs to the whole school, not one section.
    section: parsed.data.role === "supervisor" ? null : sectionId,
    capacity: parsed.data.capacity,
    label: parsed.data.label,
    createdBy: admin.id,
  });

  return NextResponse.json(
    { token, url: inviteUrl(request.nextUrl.origin, token) },
    { status: 201 },
  );
}
