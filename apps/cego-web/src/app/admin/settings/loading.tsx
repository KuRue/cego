export default function Loading() {
  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 h-14" style={{ background: "var(--color-background)", borderBottom: "1px solid var(--color-surface-border)" }}>
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-5">
          <div className="h-6 w-20 animate-pulse rounded" style={{ background: "var(--color-surface-hover)" }} />
          <div className="h-6 w-24 animate-pulse rounded" style={{ background: "var(--color-surface-hover)" }} />
          <div className="h-8 w-8 animate-pulse rounded-full" style={{ background: "var(--color-surface-hover)" }} />
        </div>
      </nav>
      <main className="page-shell mx-auto max-w-3xl px-5 pt-20 pb-16">
        <div className="space-y-6">
          <div className="h-8 w-40 animate-pulse rounded" style={{ background: "var(--color-surface-hover)" }} />
          <div className="glass-lg rounded-2xl p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-xl" style={{ background: "var(--color-surface-hover)" }} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
