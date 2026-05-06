import AppLink from "@/components/app-link";
import {
  getAdminMemberDirectory,
  normalizeDirectoryFilters,
  type AdminMemberSummary,
} from "@/lib/member-admin";
import { getCurrentMember } from "@/lib/session";
import { Badge, TagBadge } from "@/components/badge";
import Navbar from "@/components/navbar";
import { getNavbarBrand, getSiteSettings } from "@/lib/settings";
import { formatShortDate as fmtShortDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member CRM",
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const member = await getCurrentMember();
  const brand = await getNavbarBrand();
  const settings = await getSiteSettings();

  if (!member || !member.isAdmin) {
    return (
      <>
        <Navbar brand={brand} />
        <main className="page-shell mx-auto max-w-6xl px-5 py-16">
          <div className="glass-lg mx-auto max-w-md rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Organizer access required</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Sign in with an admin-listed Telegram ID to manage members.
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

  const params = await searchParams;
  const filters = normalizeDirectoryFilters(params);
  const directory = await getAdminMemberDirectory(filters);

  const inputStyle = {
    background: "var(--color-surface-hover)",
    border: "1px solid var(--color-surface-border)",
    color: "var(--color-foreground)",
  };

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
      <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-8">
        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Visible members" value={String(directory.totals.members)} />
          <Metric label="Group members" value={String(directory.totals.groupMembers)} />
          <Metric label="Not members" value={String(directory.totals.nonMembers)} />
          <Metric label="Unknown" value={String(directory.totals.unknown)} />
        </section>

        <section className="glass-lg mt-8 rounded-2xl p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <AppLink
                href="/admin"
                className="text-sm font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                &larr; Admin
              </AppLink>
              <h2 className="mt-1 text-3xl font-semibold">Members</h2>
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Search</span>
              <input
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Name, username, Telegram ID, email"
                className="h-10 rounded-xl px-3 text-sm outline-none"
                style={inputStyle}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Group</span>
              <select
                name="groupStatus"
                defaultValue={filters.groupStatus ?? "all"}
                className="h-10 rounded-xl px-3 text-sm outline-none"
                style={inputStyle}
              >
                <option value="all">All</option>
                <option value="member">member</option>
                <option value="not_member">not_member</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Event</span>
              <select
                name="eventId"
                defaultValue={filters.eventId ?? ""}
                className="h-10 rounded-xl px-3 text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Any event</option>
                {directory.filters.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Survey</span>
              <select
                name="surveyId"
                defaultValue={filters.surveyId ?? ""}
                className="h-10 rounded-xl px-3 text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Any survey</option>
                {directory.filters.surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="font-medium">Tag</span>
              <select
                name="tagId"
                defaultValue={filters.tagId ?? ""}
                className="h-10 rounded-xl px-3 text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Any tag</option>
                {directory.filters.tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
              >
                Filter
              </button>
              <AppLink
                href="/admin/members"
                className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
                style={{
                  border: "1px solid var(--color-surface-border)",
                  color: "var(--color-foreground)",
                }}
              >
                Clear
              </AppLink>
            </div>
          </form>
        </section>

        <section className="mt-5 grid gap-3">
          {directory.members.length === 0 ? (
            <div className="glass-lg rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-semibold">No members match.</h2>
              <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
                Adjust the filters or sign in with another Telegram account to
                create a member profile.
              </p>
            </div>
          ) : (
            directory.members.map((summary) => (
              <MemberRow key={summary.member.id} summary={summary} timezone={settings.timezone} />
            ))
          )}
        </section>
      </main>
    </>
  );
}

function MemberRow({ summary, timezone }: { summary: AdminMemberSummary; timezone: string }) {
  const { member, tags } = summary;

  return (
    <article className="glass-lg rounded-2xl p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{member.groupStatus}</Badge>
            {member.isAdmin ? <Badge>admin</Badge> : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold">
            {member.telegramDisplayName}
          </h2>
          <p className="mt-1 break-all text-sm" style={{ color: "var(--color-muted)" }}>
            {member.telegramUsername ? `@${member.telegramUsername}` : "No username"} - Telegram ID{" "}
            {member.telegramId}
          </p>
          {member.email ? (
            <p className="mt-1 break-all text-sm" style={{ color: "var(--color-muted)" }}>
              {member.email}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>No tags</span>
            ) : (
              tags.map((tag) => <TagBadge key={tag.id} name={tag.name} color={tag.color} />)
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Metric label="RSVPs" value={String(summary.rsvpCount)} />
          <Metric label="Surveys" value={String(summary.surveyResponseCount)} />
          <Metric label="Notes" value={String(summary.noteCount)} />
          <Metric
            label={summary.latestActivityLabel}
            value={fmtShortDate(summary.latestActivityAt, timezone)}
          />
        </div>

        <AppLink
          href={`/admin/members/${member.id}`}
          className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition lg:w-auto"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
        >
          Open profile
        </AppLink>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}


