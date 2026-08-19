import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/models/User";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 },
    );
  }

  await dbConnect();
  const user = await User.findOne({ email: parsed.data.email }).lean<UserDoc>();

  // Same message either way so the form can't be used to discover which
  // email addresses have accounts.
  const invalid = NextResponse.json(
    { error: "Incorrect email or password." },
    { status: 401 },
  );
  if (!user?.passwordHash) return invalid;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return invalid;
  }

  await createSession(String(user._id));
  return NextResponse.json({ status: user.status, role: user.role });
}
