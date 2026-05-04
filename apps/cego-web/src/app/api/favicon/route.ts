import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
  const settings = await getSiteSettings();

  if (settings.logoUrl) {
    const filename = settings.logoUrl.split("/").pop();
    if (filename) {
      const filePath = join(UPLOAD_DIR, filename);
      try {
        const fileStat = await stat(filePath);
        if (fileStat.isFile()) {
          const data = await readFile(filePath);
          const ext = filename.split(".").pop()?.toLowerCase();
          const contentType =
            ext === "png" ? "image/png"
            : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
            : ext === "webp" ? "image/webp"
            : "image/png";
          return new NextResponse(data, {
            headers: {
              "content-type": contentType,
              "cache-control": "public, max-age=3600",
            },
          });
        }
      } catch {}
    }
  }

  return NextResponse.rewrite(new URL("/favicon.ico", "http://localhost"));
}
