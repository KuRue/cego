"use client";

import { useRef, useState } from "react";

export default function BackgroundUpload({ currentUrl }: { currentUrl: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(currentUrl);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("background", file);

      const res = await fetch("/api/admin/upload-background", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Upload failed.");
        return;
      }

      setUrl(body.url);
      const hiddenInput = document.querySelector<HTMLInputElement>('input[name="backgroundUrl"]');
      if (hiddenInput) {
        hiddenInput.setAttribute("value", body.url);
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
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
      {url ? (
        <span className="text-sm" style={{ color: "var(--color-success)" }}>
          Saved. Submit the form to apply.
        </span>
      ) : null}
      {error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
      ) : null}
    </div>
  );
}
