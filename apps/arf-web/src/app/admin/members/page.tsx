import Link from "next/link";
import {
  getAdminMemberDirectory,
  normalizeDirectoryFilters,
  type AdminMemberSummary,
} from "@/lib/member-admin";
import { getCurrentMember } from "@/lib/session";

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

  if (!member || !member.isAdmin) {
    return (
      <AdminMembersShell>
        <AccessRequired />
      </AdminMembersShell>
    );
  }

  const params = await searchParams;
  const filters = normalizeDirectoryFilters(params);
  const directory = await getAdminMemberDirectory(filters);

  return (
    <AdminMembersShell memberName={member.telegramDisplayName}>
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Visible members" value={String(directory.members.length)} />
        <Metric label="Group members" value={String(directory.totals.groupMembers)} />
        <Metric label="Not members" value={String(directory.totals.nonMembers)} />
        <Metric label="Unknown" value={String(directory.totals.unknown)} />
      </section>

      <section className="mt-8 border border-white/15 bg-white p-5 text-[#1d2523]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#b4573f]">
              CRM-lite
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Members</h2>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-[#183f3c]">
            Event and survey admin
          </Link>
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid min-w-0 gap-1 text-sm">
            <span className="font-medium">Search</span>
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Name, username, Telegram ID, email"
              className="h-10 rounded-md border border-[#b8cac5] px-3"
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            <span className="font-medium">Group</span>
            <select
              name="groupStatus"
              defaultValue={filters.groupStatus ?? "all"}
              className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
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
              className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
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
              className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
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
              className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
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
              className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
            >
              Filter
            </button>
            <Link
              href="/admin/members"
              className="inline-flex h-10 items-center rounded-md border border-[#b8cac5] px-4 text-sm font-semibold text-[#183f3c]"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-5 grid gap-3">
        {directory.members.length === 0 ? (
          <div className="border border-white/15 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">No members match.</h2>
            <p className="mt-3 text-white/70">
              Adjust the filters or sign in with another Telegram account to
              create a member profile.
            </p>
          </div>
        ) : (
          directory.members.map((summary) => (
            <MemberRow key={summary.member.id} summary={summary} />
          ))
        )}
      </section>
    </AdminMembersShell>
  );
}

function AdminMembersShell({
  children,
  memberName,
}: {
  children: React.ReactNode;
  memberName?: string;
}) {
  return (
    <main className="min-h-screen bg-[#14211f] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold">
            ARF
          </Link>
          <div className="flex items-center gap-4 text-sm text-white/70">
            {memberName ? <span>{memberName}</span> : null}
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
        <div className="mt-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Organizer admin
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Search members, review history, and keep internal notes.
          </h1>
        </div>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function AccessRequired() {
  return (
    <div className="border border-white/15 bg-white/5 p-6">
      <h1 className="text-3xl font-semibold">Organizer access required.</h1>
      <p className="mt-3 max-w-2xl leading-7 text-white/70">
        Sign in through Telegram with an admin-listed Telegram ID to manage
        members.
      </p>
      <Link
        href="/sign-in"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#14211f]"
      >
        Sign in with Telegram
      </Link>
    </div>
  );
}

function MemberRow({ summary }: { summary: AdminMemberSummary }) {
  const { member, tags } = summary;

  return (
    <article className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{member.groupStatus}</Badge>
            {member.isAdmin ? <Badge>admin</Badge> : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold">
            {member.telegramDisplayName}
          </h2>
          <p className="mt-1 break-all text-sm text-[#64706c]">
            {member.telegramUsername ? `@${member.telegramUsername}` : "No username"} - Telegram ID{" "}
            {member.telegramId}
          </p>
          {member.email ? (
            <p className="mt-1 break-all text-sm text-[#64706c]">
              {member.email}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <span className="text-sm text-[#64706c]">No tags</span>
            ) : (
              tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric label="RSVPs" value={String(summary.rsvpCount)} />
          <Metric label="Surveys" value={String(summary.surveyResponseCount)} />
          <Metric label="Notes" value={String(summary.noteCount)} />
        </div>

        <Link
          href={`/admin/members/${member.id}`}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#183f3c] px-5 text-sm font-semibold text-white lg:w-auto"
        >
          Open profile
        </Link>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#e3ece9] bg-white p-3 text-[#1d2523]">
      <p className="text-xs uppercase tracking-[0.14em] text-[#6b746f]">
        {label}
      </p>
      <p className="mt-2 font-semibold text-[#183f3c]">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[#eef3f1] px-3 py-1 text-xs font-semibold text-[#4e5b57]">
      {children}
    </span>
  );
}

function TagBadge({ tag }: { tag: { name: string; color: string } }) {
  const className = tagToneClass(tag.color);

  return (
    <span
      className={`max-w-full break-all rounded-md px-3 py-1 text-xs font-semibold ${className}`}
    >
      {tag.name}
    </span>
  );
}

function tagToneClass(color: string): string {
  switch (color) {
    case "green":
      return "bg-[#dbe9e5] text-[#183f3c]";
    case "gold":
      return "bg-[#f7e9c0] text-[#6b4c00]";
    case "red":
      return "bg-[#fde1da] text-[#7c2f20]";
    case "blue":
      return "bg-[#dce8f7] text-[#24476b]";
    default:
      return "bg-[#eef3f1] text-[#4e5b57]";
  }
}
