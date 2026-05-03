import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireAdminMember } from "@/lib/session";

export const runtime = "nodejs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  await requireAdminMember();

  const formData = await request.formData();
  const file = formData.get("background");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File must be PNG, JPEG, or WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File must be under 5 MB." },
      { status: 400 },
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.type.split("/")[1];
  const filename = `background.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
