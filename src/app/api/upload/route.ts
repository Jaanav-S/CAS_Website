import { NextResponse, type NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { saveImage } from "@/lib/upload";

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user || (user.role === "student" && user.graduated)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const result = await saveImage(file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    url: result.url,
    width: result.width,
    height: result.height,
  });
}
