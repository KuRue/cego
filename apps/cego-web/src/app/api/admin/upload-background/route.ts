import { NextResponse } from "next/server";
import { ImageUploadError, saveUploadedImage } from "@/lib/image-upload";
import { getCurrentMember } from "@/lib/session";

export const runtime = "nodejs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const member = await getCurrentMember();

  if (!member || !member.isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("background");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const filename = await saveUploadedImage({
      file,
      uploadDir: UPLOAD_DIR,
      filenamePrefix: "background",
      maxFileSizeBytes: MAX_FILE_SIZE,
    });

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Could not save file." },
      { status: 500 },
    );
  }
}
