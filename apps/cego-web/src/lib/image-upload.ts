import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type SniffedImageType = {
  extension: "png" | "jpg" | "webp";
};

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export async function saveUploadedImage({
  file,
  uploadDir,
  filenamePrefix,
  maxFileSizeBytes,
}: {
  file: File;
  uploadDir: string;
  filenamePrefix: string;
  maxFileSizeBytes: number;
}): Promise<string> {
  if (file.size > maxFileSizeBytes) {
    throw new ImageUploadError(
      `File must be under ${Math.floor(maxFileSizeBytes / 1024 / 1024)} MB.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageType = sniffImageType(buffer);

  if (!imageType) {
    throw new ImageUploadError("File must be PNG, JPEG, or WebP.");
  }

  await mkdir(uploadDir, { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const filename = `${filenamePrefix}-${randomUUID()}.${imageType.extension}`;

    try {
      await writeFile(join(uploadDir, filename), buffer, { flag: "wx" });
      return filename;
    } catch (error) {
      if (isFileExistsError(error)) continue;
      throw error;
    }
  }

  throw new Error("Could not create a unique upload filename.");
}

function sniffImageType(buffer: Buffer): SniffedImageType | null {
  if (isPng(buffer)) return { extension: "png" };
  if (isJpeg(buffer)) return { extension: "jpg" };
  if (isWebp(buffer)) return { extension: "webp" };
  return null;
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer: Buffer): boolean {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function isFileExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EEXIST"
  );
}
