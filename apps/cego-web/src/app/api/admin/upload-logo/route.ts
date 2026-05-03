import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/session";

export const runtime = "nodejs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(request: Request) {
  const member = await getCurrentMember();

  if (!member || !member.isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("logo");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File must be PNG, JPEG, WebP, or SVG." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File must be under 2 MB." },
      { status: 400 },
    );
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    return NextResponse.json(
      { error: "Could not create upload directory." },
      { status: 500 },
    );
  }

  const ext = file.type.split("/")[1] === "svg+xml" ? "svg" : file.type.split("/")[1];
  const timestamp = Date.now();
  const filename = `logo-${timestamp}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(UPLOAD_DIR, filename), buffer);
  } catch {
    return NextResponse.json(
      { error: "Could not save file." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: `/uploads/${filename}` });
}
