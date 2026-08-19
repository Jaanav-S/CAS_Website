import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { firstIssue } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(1, "Give the section a name, e.g. DP1-A."),
  year: z.string().trim().min(4, "Select a year."),
});

export async function POST(request: NextRequest) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();
  const existing = await Section.findOne(parsed.data);
  if (existing) {
    return NextResponse.json(
      { error: "That section already exists for this year." },
      { status: 409 },
    );
  }

  const section = await Section.create({ ...parsed.data, teachers: [] });
  return NextResponse.json({ id: String(section._id) }, { status: 201 });
}
