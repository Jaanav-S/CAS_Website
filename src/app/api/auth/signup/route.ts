import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { createSession, hashPassword } from "@/lib/auth";
import { initialAccess } from "@/lib/bootstrap";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  await dbConnect();
  if (await User.findOne({ email })) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const access = await initialAccess(email);
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    ...access,
  });

  await createSession(String(user._id));
  return NextResponse.json({ status: user.status, role: user.role });
}
