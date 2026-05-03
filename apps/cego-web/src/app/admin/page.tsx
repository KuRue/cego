import AppLink from "@/components/app-link";
import { getAdminEvents } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";
import Navbar from "@/components/navbar";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const member = await getCurrentMember();
  const settings = await getSiteSettings();
  const brand = { siteName: settings.siteName, logoUrl: settings.logoUrl };

  if (!member || !member.isAdmin) {
    return (
      <>
        <Navbar brand={brand} />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <div className="glass-lg mx-auto max-w-md rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Organizer access required</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Sign in with an admin-listed Telegram ID to manage events.
            </p>
            <AppLink
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Sign in
            </AppLink>
          </div>
        </main>
      </>
    );
  }

  const eventOverviews = await getAdminEvents();

  const openEvents = eventOverviews.filter(
    (e) => e.event.status === "open" || e.event.status === "full",
  );

  return (
    <>
      <Navbar
        member={{
          telegramDisplayName: member.telegramDisplayName,
          telegramPhotoUrl: member.telegramPhotoUrl,
          isAdmin: member.isAdmin,
        }}
        brand={brand}
      />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          Manage events, surveys, members, and site settings.
        </p>

        {openEvents.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--color-muted)" }}>
              Active events
            </h2>
            <div className="mt-4 grid gap-4">
              {openEvents.map((overview) => (
                <AppLink
                  key={overview.event.id}
                  href={`/admin/events?id=${overview.event.id}`}
                  className="glass glass-hover block rounded-2xl p-5 transition"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-highlight)" }}>
                      {overview.event.type === "major_event" ? "Major" : "Local"}
                    </span>
                    <span
                      className="rounded-lg px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}
                    >
                      {overview.event.status}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{overview.event.title}</h3>
                  <div className="mt-3 flex gap-6 text-sm" style={{ color: "var(--color-muted)" }}>
                    <span>{overview.confirmedCount}/{overview.event.capacity} filled</span>
                    {overview.waitlistedCount > 0 ? (
                      <span>{overview.waitlistedCount} waitlisted</span>
                    ) : null}
                    <span>{formatDateShort(overview.event.startsAt)}</span>
                  </div>
                </AppLink>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NavButton href="/admin/events">Events</NavButton>
          <NavButton href="/admin/surveys">Surveys</NavButton>
          <NavButton href="/admin/members">Members</NavButton>
          <NavButton href="/admin/settings">Settings</NavButton>
          <NavButton href="/admin/diagnostics">Diagnostics</NavButton>
        </nav>
      </main>
    </>
  );
}

function NavButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <AppLink
      href={href}
      className="glass glass-hover flex h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition"
    >
      {children}
    </AppLink>
  );
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
