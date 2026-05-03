import Link from "next/link";
import Script from "next/script";
import Navbar from "@/components/navbar";
import { getSiteSettings } from "@/lib/settings";
import TelegramMiniAppRedirect from "./telegram-mini-app-redirect";

const eventTypes = [
  {
    title: "Major event",
    description:
      "A capacity-managed community event with RSVP, preference surveys, organizer approval, and a cego-owned registration flow.",
  },
  {
    title: "Local events",
    description:
      "Smaller local meets using the same Telegram identity, RSVP, waitlist, survey, and notification model without paid checkout by default.",
  },
];

const operatingModel = [
  "Telegram is the account.",
  "Group membership gates access.",
  "RSVPs confirm until capacity.",
  "Full events move new requests to a manual waitlist.",
  "Payment workflows can be added after organizer approval.",
];

const dashboardPreview = [
  { label: "Identity", value: "Telegram verified" },
  { label: "Major RSVP", value: "Waitlist aware" },
  { label: "Surveys", value: "Built into cego" },
  { label: "Payments", value: "cego-native later" },
];

export default async function Home() {
  const settings = await getSiteSettings();

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <TelegramMiniAppRedirect />
      <Navbar brand={{ siteName: settings.siteName, logoUrl: settings.logoUrl }} />
      <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pt-20">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p
              className="font-mono text-xs uppercase tracking-[0.24em]"
              style={{ color: "var(--color-danger)" }}
            >
              Telegram-first event operations
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              {settings.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: "var(--color-muted)" }}>
              {settings.heroBody}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              >
                Sign in with Telegram
              </Link>
              <Link
                href="/dashboard"
                className="glass glass-hover inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              >
                View Dashboard
              </Link>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -left-4 top-8 h-24 w-24 rounded-xl"
              style={{ background: "var(--color-highlight)", opacity: 0.6 }}
            />
            <div className="glass-lg relative rounded-2xl p-5">
              <div
                className="flex items-center justify-between pb-4"
                style={{ borderBottom: "1px solid var(--color-surface-border)" }}
              >
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ color: "var(--color-danger)" }}
                  >
                    Community 2027
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Major event intake</h2>
                </div>
                <span
                  className="rounded-lg px-3 py-1 text-sm font-medium"
                  style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}
                >
                  RSVP first
                </span>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-2">
                {dashboardPreview.map((item) => (
                  <div
                    key={item.label}
                    className="glass rounded-xl p-4"
                  >
                    <p
                      className="text-xs uppercase tracking-[0.16em]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div
                className="space-y-3 pt-5"
                style={{ borderTop: "1px solid var(--color-surface-border)" }}
              >
                {operatingModel.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--color-highlight)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--color-muted)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="grid gap-6 lg:grid-cols-2">
            {eventTypes.map((eventType) => (
              <article key={eventType.title} className="glass-lg rounded-2xl p-6">
                <h2 className="text-2xl font-semibold">{eventType.title}</h2>
                <p className="mt-3 leading-7" style={{ color: "var(--color-muted)" }}>
                  {eventType.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer
          className="mt-16 flex flex-col gap-3 py-8 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--color-surface-border)", color: "var(--color-muted)" }}
        >
          <span>{settings.footerText}</span>
          <div className="flex gap-4">
            <a href="https://github.com/KuRue/cego" rel="noreferrer">
              Source code
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
