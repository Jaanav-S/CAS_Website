import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { CONTENT_TYPES, STORED_NAME, UPLOAD_DIR } from "@/lib/upload";

/** Serves an uploaded image, but only to a signed-in, approved account. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/uploads/[name]">,
) {
  const user = await apiUser();
  if (!user) return new NextResponse("Not allowed.", { status: 403 });

  const { name } = await ctx.params;
  if (!STORED_NAME.test(name)) {
    return new NextResponse("Not found.", { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[path.extname(name)] ?? "application/octet-stream",
        // Private: caches must not hand this to a different signed-in user.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
