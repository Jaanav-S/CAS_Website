import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { resolveMembers } from "@/lib/projects";
import { MAX_PROJECT_MEMBERS } from "@/lib/constants";

const schema = z.object({
  emails: z.array(z.string()).max(MAX_PROJECT_MEMBERS + 4),
});

/** Live check used by the project form while the student types addresses. */
export async function POST(request: NextRequest) {
  const user = await apiUser("student");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a list of emails." }, { status: 400 });
  }

  return NextResponse.json({
    results: await resolveMembers(parsed.data.emails, user.id),
  });
}
