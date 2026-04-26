import Link from "next/link";

const eventTypes = [
  {
    title: "Annual retreat",
    description:
      "A capacity-managed Florida short-term-rental retreat with RSVP, preference surveys, and payment approval through Hi.Events.",
  },
  {
    title: "Mini retreats",
    description:
      "Smaller local meets using the same Telegram identity, RSVP, waitlist, survey, and notification model without paid checkout by default.",
  },
];

const operatingModel = [
  "Telegram is the account.",
  "Group membership gates access.",
  "RSVPs confirm until capacity.",
  "Full events move new requests to a manual waitlist.",
  "Annual retreat payment opens only after organizer approval.",
];

const dashboardPreview = [
  { label: "Identity", value: "Telegram verified" },
  { label: "Annual RSVP", value: "Waitlist aware" },
  { label: "Surveys", value: "Built into ARF" },
  { label: "Payments", value: "Hi.Events after approval" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f8f6] text-[#1d2523]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="ARF home">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-[#183f3c] font-semibold text-white">
            ARF
          </span>
          <span className="text-sm font-semibold tracking-wide">
            Anthro Retreat Florida
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[#4e5b57] md:flex">
          <Link href="/mini-app" className="hover:text-[#183f3c]">
            Mini App
          </Link>
          <Link href="/dashboard" className="hover:text-[#183f3c]">
            Dashboard
          </Link>
          <Link href="/admin" className="hover:text-[#183f3c]">
            Admin
          </Link>
          <a
            href="https://github.com/KuRue/ARF"
            className="hover:text-[#183f3c]"
            rel="noreferrer"
          >
            Source
          </a>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-16">
        <div className="flex flex-col justify-center">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-[#b4573f]">
            Telegram-first retreat operations
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-[#14211f] sm:text-6xl lg:text-7xl">
            Plan ARF without turning the group chat into a spreadsheet.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4e5b57]">
            ARF is the self-hosted planning surface for annual Florida retreats
            and local mini retreats: Telegram identity, capacity-aware RSVPs,
            built-in surveys, organizer review, and Hi.Events checkout when a
            paid registration is ready.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mini-app"
              className="inline-flex h-12 items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white transition hover:bg-[#245b55]"
            >
              Open Mini App Shell
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-md border border-[#b8cac5] px-5 text-sm font-semibold text-[#1d2523] transition hover:border-[#183f3c]"
            >
              View Member Dashboard
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-4 top-8 h-24 w-24 rounded-md bg-[#d8b35a]" />
          <div className="relative border border-[#cadbd7] bg-white p-4 shadow-[0_24px_80px_rgba(29,37,35,0.12)]">
            <div className="border border-[#dfe9e6] bg-[#f8fbff] p-5">
              <div className="flex items-center justify-between border-b border-[#dfe9e6] pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b4573f]">
                    ARF 2027
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Annual retreat intake
                  </h2>
                </div>
                <span className="rounded-md bg-[#dbe9e5] px-3 py-1 text-sm font-medium text-[#183f3c]">
                  RSVP first
                </span>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-2">
                {dashboardPreview.map((item) => (
                  <div key={item.label} className="border border-[#dfe9e6] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#6b746f]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#183f3c]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-[#dfe9e6] pt-5">
                {operatingModel.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d8b35a]" />
                    <span className="text-sm text-[#3a4642]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d7e3df] bg-[#f8fbff]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-2">
          {eventTypes.map((eventType) => (
            <article key={eventType.title} className="border border-[#d7e3df] bg-white p-6">
              <h2 className="text-2xl font-semibold text-[#14211f]">
                {eventType.title}
              </h2>
              <p className="mt-3 leading-7 text-[#4e5b57]">
                {eventType.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[#64706c] sm:px-8 md:flex-row md:items-center md:justify-between">
        <span>AGPLv3. Self-hosted. Built for arf.kurue.com.</span>
        <div className="flex gap-4">
          <Link href="/admin" className="hover:text-[#183f3c]">
            Organizer admin
          </Link>
          <a href="https://github.com/KuRue/ARF" className="hover:text-[#183f3c]">
            Source code
          </a>
        </div>
      </footer>
    </main>
  );
}

