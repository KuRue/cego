import Link from "next/link";

const checks = [
  "Verify Telegram Mini App init data.",
  "Create or update the Telegram-backed ARF member.",
  "Check configured Telegram group membership.",
  "Load active annual retreats and mini retreats.",
];

export const metadata = {
  title: "Telegram Mini App",
};

export default function MiniAppPage() {
  return (
    <main className="min-h-screen bg-[#f3f8f6] px-5 py-6 text-[#1d2523]">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl flex-col justify-between border border-[#cadbd7] bg-white p-5 shadow-[0_20px_60px_rgba(29,37,35,0.1)]">
        <div>
          <Link href="/" className="text-sm font-semibold text-[#183f3c]">
            ARF
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
            Telegram Mini App shell
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Your Telegram identity becomes your ARF account.
          </h1>
          <p className="mt-4 leading-7 text-[#4e5b57]">
            This route is the future Mini App entry point. The next vertical
            slice will replace this static shell with signed Telegram init data
            verification and group membership gating.
          </p>
          <div className="mt-8 space-y-3">
            {checks.map((check, index) => (
              <div key={check} className="flex gap-3 border border-[#dfe9e6] p-4">
                <span className="font-mono text-sm text-[#b4573f]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-[#3a4642]">{check}</span>
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white"
        >
          Continue to dashboard shell
        </Link>
      </section>
    </main>
  );
}

