"use client";

import { useRef, useState } from "react";

export default function EventImageUpload({ currentUrl, fieldName = "imageUrl" }: { currentUrl: string | null; fieldName?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Select a file first.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/admin/upload-event-image", {
        method: "POST",
        body: form,
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || `Upload failed (${res.status}).`);
        return;
      }

      setSuccess("Image uploaded.");
      const hiddenInput = document.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
      if (hiddenInput) {
        hiddenInput.setAttribute("value", body.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
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
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {success ? (
        <span className="text-sm" style={{ color: "var(--color-success)" }}>{success}</span>
      ) : null}
      {error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
      ) : null}
    </div>
  );
}
