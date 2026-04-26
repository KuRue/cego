import Link from "next/link";

const adminAreas = [
  "Events and capacity",
  "RSVP and waitlist review",
  "Annual retreat payment approvals",
  "Survey publishing",
  "Telegram notification audit",
  "Hi.Events and EspoCRM sync status",
];

export const metadata = {
  title: "Organizer Admin",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#14211f] px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold">
            ARF
          </Link>
          <span className="rounded-md border border-white/20 px-3 py-1 text-sm text-white/80">
            Cloudflare Access required
          </span>
        </div>
        <div className="mt-16 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Organizer admin shell
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">
            Manage capacity, waitlists, surveys, and payment readiness.
          </h1>
          <p className="mt-5 text-lg leading-8 text-white/70">
            This route defines the organizer surface that will sit behind
            Cloudflare Access and ARF app-level admin roles.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {adminAreas.map((area) => (
            <div key={area} className="border border-white/15 bg-white/5 p-5">
              <p className="font-medium">{area}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

