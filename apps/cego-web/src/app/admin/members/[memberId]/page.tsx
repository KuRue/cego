import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assignExistingMemberTagAction,
  createAndAssignMemberTagAction,
  createMemberNoteAction,
  removeMemberTagAction,
  updateMemberEmailAction,
} from "@/lib/member-admin-actions";
import {
  getAdminMemberDetail,
  type AdminMemberDetail,
} from "@/lib/member-admin";
import { getCurrentMember } from "@/lib/session";
import { formatSurveyAnswer, parseSurveySchema } from "@/lib/surveys";
import { Badge, getTagTone, StatusBadge } from "@/components/badge";
import Navbar from "@/components/navbar";
import { getNavbarBrand } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member Profile",
};

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const currentMember = await getCurrentMember();
  const brand = await getNavbarBrand();

  if (!currentMember || !currentMember.isAdmin) {
    return (
      <>
        <Navbar brand={brand} />
        <main className="page-shell mx-auto max-w-6xl px-5 py-16">
          <div className="glass-lg mx-auto max-w-md rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold">Organizer access required</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Sign in with an admin-listed Telegram ID to manage members.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-semibold transition"
              style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
            >
              Sign in
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { memberId } = await params;
  const detail = await getAdminMemberDetail(memberId);

  if (!detail) {
    notFound();
  }

  const assignedTagIds = new Set(detail.tags.map((tag) => tag.id));
  const assignableTags = detail.availableTags.filter(
    (tag) => !assignedTagIds.has(tag.id),
  );

  const inputStyle = {
    background: "var(--color-surface-hover)",
    border: "1px solid var(--color-surface-border)",
    color: "var(--color-foreground)",
  };
  const activityItems = buildActivityItems(detail);
  const latestActivityAt = activityItems[0]?.date ?? detail.member.updatedAt;

  return (
    <>
      <Navbar
        member={{
          telegramDisplayName: currentMember.telegramDisplayName,
          telegramPhotoUrl: currentMember.telegramPhotoUrl,
          isAdmin: currentMember.isAdmin,
        }}
        brand={brand}
      />
      <main className="page-shell mx-auto max-w-6xl px-5 pb-16 pt-8">
        <section className="glass-lg rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{detail.member.groupStatus}</Badge>
                {detail.member.isAdmin ? <Badge>admin</Badge> : null}
              </div>
              <h2 className="mt-4 text-3xl font-semibold">
                {detail.member.telegramDisplayName}
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                {detail.member.telegramUsername
                  ? `@${detail.member.telegramUsername}`
                  : "No username"}{" "}
                - Telegram ID {detail.member.telegramId}
              </p>
            </div>
            <Link
              href="/admin/members"
              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
              style={{
                border: "1px solid var(--color-surface-border)",
                color: "var(--color-foreground)",
              }}
            >
              Back to members
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="RSVPs" value={String(detail.rsvps.length)} />
            <Metric
              label="Surveys"
              value={String(detail.surveyResponses.length)}
            />
            <Metric label="Notes" value={String(detail.notes.length)} />
            <Metric label="Tags" value={String(detail.tags.length)} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Fact label="Email" value={detail.member.email ?? "Not set"} />
            <Fact label="Joined" value={formatDate(detail.member.createdAt)} />
            <Fact label="Updated" value={formatDate(detail.member.updatedAt)} />
            <Fact label="Last activity" value={formatDate(latestActivityAt)} />
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5">
            <Panel title="Contact">
              <form action={updateMemberEmailAction} className="grid gap-3">
                <input type="hidden" name="memberId" value={detail.member.id} />
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Email</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={detail.member.email ?? ""}
                    placeholder="Used for organizer contact and future payment steps"
                    className="h-10 rounded-xl px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </label>
                <button
                  type="submit"
                  className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                  style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                >
                  Save contact
                </button>
              </form>
            </Panel>

            <Panel title="Tags">
              {detail.tags.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No tags assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.tags.map((tag) => {
                    const tone = getTagTone(tag.color);
                    return (
                      <form key={tag.id} action={removeMemberTagAction}>
                        <input
                          type="hidden"
                          name="memberId"
                          value={detail.member.id}
                        />
                        <input type="hidden" name="tagId" value={tag.id} />
                        <button
                          type="submit"
                          className="inline-flex max-w-full items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
                          style={{ background: tone.bg, color: tone.text }}
                          title={`Remove ${tag.name}`}
                        >
                          {tag.name}
                          <span className="font-mono opacity-70">remove</span>
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}

              <details className="glass mt-4 rounded-xl p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  Assign existing tag
                </summary>
                <form action={assignExistingMemberTagAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="memberId" value={detail.member.id} />
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Tag</span>
                    <select
                      name="tagId"
                      disabled={assignableTags.length === 0}
                      className="h-10 rounded-xl px-3 text-sm outline-none disabled:opacity-50"
                      style={inputStyle}
                    >
                      <option value="">
                        {assignableTags.length === 0
                          ? "No available tags"
                          : "Choose tag"}
                      </option>
                      {assignableTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={assignableTags.length === 0}
                    className="h-10 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      border: "1px solid var(--color-surface-border)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    Assign tag
                  </button>
                </form>
              </details>

              <details className="glass mt-4 rounded-xl p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  Create new tag
                </summary>
                <form
                  action={createAndAssignMemberTagAction}
                  className="mt-4 grid gap-3"
                >
                  <input type="hidden" name="memberId" value={detail.member.id} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr]">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">New tag</span>
                      <input
                        name="tagName"
                        placeholder="rooming, staff, accessibility"
                        className="h-10 rounded-xl px-3 text-sm outline-none"
                        style={inputStyle}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">Color</span>
                      <select
                        name="color"
                        defaultValue="gray"
                        className="h-10 rounded-xl px-3 text-sm outline-none"
                        style={inputStyle}
                      >
                        <option value="gray">gray</option>
                        <option value="green">green</option>
                        <option value="gold">gold</option>
                        <option value="red">red</option>
                        <option value="blue">blue</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                    style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                  >
                    Create and assign
                  </button>
                </form>
              </details>
            </Panel>

            <Panel title="Internal Notes">
              <details className="glass rounded-xl p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  Add organizer note
                </summary>
                <form action={createMemberNoteAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="memberId" value={detail.member.id} />
                  <textarea
                    name="body"
                    required
                    rows={4}
                    placeholder="Organizer-only note"
                    className="min-h-28 rounded-xl px-3 py-2 text-sm leading-6 outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="submit"
                    className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                    style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                  >
                    Add note
                  </button>
                </form>
              </details>

              {detail.notes.length === 0 ? (
                <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>No notes yet.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {detail.notes.map(({ note, author }) => (
                    <article key={note.id} className="glass rounded-xl p-4">
                      <p className="whitespace-pre-wrap leading-6">{note.body}</p>
                      <p className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
                        {author?.telegramDisplayName ?? "Unknown organizer"} on{" "}
                        {formatDate(note.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-5">
            <Panel title="Activity Timeline">
              {activityItems.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No activity yet.</p>
              ) : (
                <div className="grid gap-3">
                  {activityItems.slice(0, 8).map((item) => (
                    <article key={item.id} className="glass rounded-xl p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{item.kind}</Badge>
                        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <h3 className="mt-3 font-semibold">{item.title}</h3>
                      {item.description ? (
                        <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
                          {item.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="RSVP History">
              {detail.rsvps.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No RSVPs yet.</p>
              ) : (
                <div className="grid gap-3">
                  {detail.rsvps.map(({ rsvp, event }) => (
                    <article key={rsvp.id} className="glass rounded-xl p-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={rsvp.status} />
                        <Badge>
                          {event.type === "major_event" ? "major" : "local"}
                        </Badge>
                        <StatusBadge status={event.status} />
                      </div>
                      <h3 className="mt-3 font-semibold">{event.title}</h3>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                        {formatDate(event.startsAt)}
                      </p>
                      {rsvp.ticketType ? (
                        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                          Ticket: {rsvp.ticketType}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Survey Responses">
              {detail.surveyResponses.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No survey responses yet.</p>
              ) : (
                <div className="grid gap-3">
                  {detail.surveyResponses.map(({ response, survey, event }) => (
                    <article
                      key={response.id}
                      className="glass rounded-xl p-4"
                    >
                      <h3 className="font-semibold">{survey.title}</h3>
                      {event ? (
                        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                          Linked to {event.title}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                        Updated {formatDate(response.updatedAt)}
                      </p>
                      <dl className="mt-4 grid gap-3">
                        {formatSurveyResponse(
                          response.answersJson,
                          survey.schemaJson,
                        ).map(({ label, answer }) => (
                          <div key={label}>
                            <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                              {label}
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap leading-6">
                              {answer}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </section>
      </main>
    </>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="glass-lg rounded-2xl p-5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl px-4 py-3" style={{ border: "1px solid var(--color-surface-border)" }}>
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  description?: string;
  date: Date;
}

function buildActivityItems(detail: AdminMemberDetail): ActivityItem[] {
  const noteItems = detail.notes.map(({ note, author }) => ({
    id: `note:${note.id}`,
    kind: "Note",
    title: trimActivityTitle(note.body),
    description: `Added by ${author?.telegramDisplayName ?? "Unknown organizer"}`,
    date: note.createdAt,
  }));
  const rsvpItems = detail.rsvps.map(({ rsvp, event }) => ({
    id: `rsvp:${rsvp.id}`,
    kind: "RSVP",
    title: `${rsvp.status} for ${event.title}`,
    description: `${event.type === "major_event" ? "Major" : "Local"} event`,
    date: rsvp.updatedAt,
  }));
  const surveyItems = detail.surveyResponses.map(({ response, survey, event }) => ({
    id: `survey:${response.id}`,
    kind: "Survey",
    title: survey.title,
    description: event ? `Linked to ${event.title}` : "General member survey",
    date: response.updatedAt,
  }));

  return [...noteItems, ...rsvpItems, ...surveyItems].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

function trimActivityTitle(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}

function formatSurveyResponse(answersJson: unknown, schemaJson: unknown) {
  const answers = readAnswerRecord(answersJson);
  const schema = parseSurveySchema(schemaJson);

  if (schema.questions.length > 0) {
    return schema.questions.map((question) => ({
      label: question.label,
      answer: formatSurveyAnswer(answers[question.id]),
    }));
  }

  return Object.entries(answers).map(([label, value]) => ({
    label,
    answer: formatSurveyAnswer(value),
  }));
}

function readAnswerRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
}
