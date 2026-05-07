import { readFile, stat } from "node:fs/promises";
import { join, normalize, relative } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = normalize(process.env.UPLOAD_DIR || "/data/uploads");

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filename = segments[segments.length - 1];
  const ext = filename.split(".").pop()?.toLowerCase();

  if (!ext || !CONTENT_TYPES[ext]) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = normalize(join(UPLOAD_DIR, filename));
  if (!filePath.startsWith(UPLOAD_DIR + "/") && filePath !== UPLOAD_DIR) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await readFile(filePath);

  return new NextResponse(data, {
    headers: {
      "content-type": CONTENT_TYPES[ext],
      "cache-control": "public, max-age=86400",
    },
  });
}
