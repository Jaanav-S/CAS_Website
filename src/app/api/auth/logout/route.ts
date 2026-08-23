import { NextResponse } from "next/server";
import { destroySession, getSession, isMaintainer } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

export async function POST() {
  const user = await getSession();

  // A maintainer's account is created just-in-time when they sign in. On the
  // way out we remove it, so the database keeps no record that they were ever
  // here. (Ordinary accounts are untouched.)
  if (user && isMaintainer(user.email)) {
    await dbConnect();
    await User.deleteOne({ _id: user.id });
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
