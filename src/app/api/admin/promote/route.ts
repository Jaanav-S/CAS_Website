import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { firstIssue } from "@/lib/validation";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.object({
  action: z.literal("graduate"),
  /** Explicit list, taken from what the admin was actually shown. */
  studentIds: z.array(objectId).min(1, "Select at least one student."),
});

/**
 * End-of-year graduation. DP1 → DP2 promotion is automatic now (a section
 * advances with the academic year), so the only deliberate act left is marking
 * the leaving cohort as graduated.
 */
export async function POST(request: NextRequest) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  await dbConnect();

  // Restricted to students so a mis-sent id cannot graduate a teacher.
  const result = await User.updateMany(
    { _id: { $in: parsed.data.studentIds }, role: "student" },
    { graduated: true },
  );
  return NextResponse.json({ graduated: result.modifiedCount });
}
