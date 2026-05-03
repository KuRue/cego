"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  useEffect(() => {
    if (retryCount >= 3) return;

    const isMiniApp = typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;

    if (isMiniApp && retryCount < 2) {
      const delay = 1500 * (retryCount + 1);
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        reset();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [retryCount, reset]);

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-5 py-16">
      <div className="glass-lg mx-auto max-w-md rounded-2xl p-8 text-center">
        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-xl font-bold"
          style={{ background: "var(--color-surface-hover)", color: "var(--color-muted)" }}
        >
          !
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          {retryCount >= 3
            ? "Multiple attempts failed. Try closing and reopening the app."
            : retryCount > 0
              ? `Retrying (attempt ${retryCount + 1} of 3)...`
              : "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={() => {
            setRetryCount(0);
            reset();
          }}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
