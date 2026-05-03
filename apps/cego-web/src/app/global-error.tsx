"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h1>
            <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error.digest
                ? `An error occurred (ref: ${error.digest}). Please try again.`
                : "An unexpected error occurred. Please try again."}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                background: "#183f3c",
                color: "#fff",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
