import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { firstIssue } from "@/lib/validation";
import { DP_YEARS } from "@/lib/constants";
import { academicYearLabel, newSectionGradYear } from "@/lib/cohort";

const schema = z.object({
  name: z.string().trim().min(1, "Give the section a name, e.g. DP1-A."),
  // The stage the cohort starts at; the academic year is derived from today,
  // never entered by hand. DP1 is the usual case.
  dpYear: z.enum(DP_YEARS).default("DP1"),
});

export async function POST(request: NextRequest) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { name, dpYear } = parsed.data;
  const gradYear = newSectionGradYear(dpYear);
  // The cohort's DP1 academic-year label — a stable key for the unique index.
  const year = academicYearLabel(gradYear - 2);

  await dbConnect();
  // Match on either key so a legacy section (no grad year stored) is caught too.
  const existing = await Section.findOne({ name, $or: [{ gradYear }, { year }] });
  if (existing) {
    return NextResponse.json(
      { error: "That section already exists for this cohort." },
      { status: 409 },
    );
  }

  const section = await Section.create({ name, gradYear, year, dpYear, teachers: [] });
  return NextResponse.json({ id: String(section._id) }, { status: 201 });
}
