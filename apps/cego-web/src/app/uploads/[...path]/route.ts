import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || "/data/uploads");

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = extname(segments[segments.length - 1] ?? "")
    .slice(1)
    .toLowerCase();

  if (!ext || !CONTENT_TYPES[ext]) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = resolve(UPLOAD_DIR, ...segments);
  if (!isPathInside(filePath, UPLOAD_DIR)) {
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
      "x-content-type-options": "nosniff",
      "cache-control": "public, max-age=86400",
    },
  });
}

function isPathInside(filePath: string, parentPath: string): boolean {
  const normalizedFile = process.platform === "win32" ? filePath.toLowerCase() : filePath;
  const normalizedParent = process.platform === "win32" ? parentPath.toLowerCase() : parentPath;

  return normalizedFile.startsWith(`${normalizedParent}${sep}`);
}
