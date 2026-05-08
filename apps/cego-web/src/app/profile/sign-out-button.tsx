"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          "x-cego-csrf": "1",
        },
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
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
    </div>
  );
}
