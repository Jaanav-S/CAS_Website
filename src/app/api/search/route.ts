import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { searchAll } from "@/lib/search";

/** Staff keyword search over reflections and CAS projects. */
export async function GET(request: NextRequest) {
  // Admits admin, coordinator (admin-equivalent), supervisor and the maintainer.
  const user = await apiUser("admin", "supervisor");
  if (!user) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ results: await searchAll(q) });
}
