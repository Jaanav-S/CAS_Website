import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Invite } from "@/models/Invite";

/** Turns a link off early. Anyone who already joined through it keeps their account. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/admin/invites/[id]">,
) {
  const admin = await apiUser("admin");
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await ctx.params;
  await dbConnect();
  const invite = await Invite.findByIdAndUpdate(id, { revoked: true });
  if (!invite) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
