"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { csrfHeaders } from "@/lib/csrf-client";

export default function GalleryUpload({ initial, fieldId }: { initial: string[]; fieldId: string }) {
  const [images, setImages] = useState<string[]>(initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/admin/upload-event-image", {
        method: "POST",
        headers: csrfHeaders(),
        body: form,
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Upload failed.");
        return;
      }

      const next = [...images, body.url];
      setImages(next);
      syncHidden(next);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(index: number) {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    syncHidden(next);
  }

  function syncHidden(urls: string[]) {
    const hidden = document.getElementById(fieldId) as HTMLInputElement | null;
    if (hidden?.name === "galleryImages") {
      hidden.setAttribute("value", urls.length > 0 ? JSON.stringify(urls) : "");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={url} className="group relative">
            <Image
              src={url}
              alt={`Gallery ${i + 1}`}
              width={96}
              height={64}
              className="h-16 w-24 rounded-lg object-cover"
              style={{ border: "1px solid var(--color-surface-border)" }}
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition"
              style={{ background: "var(--color-danger)", color: "#fff" }}
            >
              x
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm"
          style={{ color: "var(--color-muted)" }}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="h-9 rounded-xl px-4 text-sm font-medium transition"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-on-accent)",
            opacity: uploading ? 0.5 : 1,
          }}
        >
          {uploading ? "Uploading..." : "Add image"}
        </button>
        {error ? (
          <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
        ) : null}
      </div>
      <input id={fieldId} type="hidden" name="galleryImages" defaultValue={images.length > 0 ? JSON.stringify(images) : ""} />
    </div>
  );
}
