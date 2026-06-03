"use client";

import { useState } from "react";
import { csrfHeaders } from "@/lib/csrf-client";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          ...csrfHeaders(),
        },
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      // 403 here usually means the CSRF cookie is missing. The middleware
      // re-issues it on every page load; refreshing the page once will fix it.
      if (response.status === 403) {
        setError("Session needs a refresh. Reload this page and click Sign out again.");
      } else {
        setError(`Sign out failed (${response.status}). Try reloading the page.`);
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
      setLoading(false);
    }
  }

  return (
    <div className="glass mt-6 rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Session</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
        Sign out to end your current session.
      </p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="mt-4 inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold transition"
        style={{
          background: "var(--color-danger-bg)",
          border: "1px solid var(--color-danger-border)",
          color: "var(--color-danger)",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {error ? (
        <p className="mt-3 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
