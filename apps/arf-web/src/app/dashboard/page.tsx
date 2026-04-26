import Link from "next/link";

const statuses = [
  { label: "Telegram", value: "Pending integration" },
  { label: "Group gate", value: "Required for RSVP" },
  { label: "Annual retreat", value: "RSVP first" },
  { label: "Mini retreats", value: "Free RSVP" },
];

export const metadata = {
  title: "Member Dashboard",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#1d2523]">
      <header className="border-b border-[#d7e3df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-semibold text-[#183f3c]">
            ARF
          </Link>
          <Link href="/mini-app" className="text-sm text-[#4e5b57]">
            Mini App
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
          Member dashboard shell
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
          One place for your RSVP, waitlist status, surveys, and retreat
          updates.
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {statuses.map((status) => (
            <div key={status.label} className="border border-[#d7e3df] bg-white p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6b746f]">
                {status.label}
              </p>
              <p className="mt-3 text-lg font-semibold text-[#183f3c]">
                {status.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 border border-[#d7e3df] bg-[#f3f8f6] p-6">
          <h2 className="text-2xl font-semibold">Next implementation slice</h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#4e5b57]">
            Wire Telegram verification to this surface, create the member
            profile, check group membership, then show real event RSVP actions.
          </p>
        </div>
      </section>
    </main>
  );
}

