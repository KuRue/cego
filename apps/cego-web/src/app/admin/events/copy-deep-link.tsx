"use client";

export default function CopyDeepLink({ slug, botUsername }: { slug: string; botUsername: string }) {
  const deepLink = `https://t.me/${botUsername}/miniapp?startapp=event-${slug}`;

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="truncate text-xs" style={{ color: "var(--color-muted)" }}>{deepLink}</span>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(deepLink); }}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        Copy
      </button>
    </div>
  );
}
