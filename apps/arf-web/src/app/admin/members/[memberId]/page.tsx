import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assignExistingMemberTagAction,
  createAndAssignMemberTagAction,
  createMemberNoteAction,
  removeMemberTagAction,
  updateMemberEmailAction,
} from "@/lib/member-admin-actions";
import { getAdminMemberDetail } from "@/lib/member-admin";
import { getCurrentMember } from "@/lib/session";
import { formatSurveyAnswer, parseSurveySchema } from "@/lib/surveys";

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

  if (!currentMember || !currentMember.isAdmin) {
    return (
      <MemberProfileShell>
        <AccessRequired />
      </MemberProfileShell>
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

  return (
    <MemberProfileShell memberName={currentMember.telegramDisplayName}>
      <section className="border border-white/15 bg-white p-5 text-[#1d2523]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>{detail.member.groupStatus}</Badge>
              {detail.member.isAdmin ? <Badge>admin</Badge> : null}
            </div>
            <h2 className="mt-4 text-3xl font-semibold">
              {detail.member.telegramDisplayName}
            </h2>
            <p className="mt-2 text-sm text-[#64706c]">
              {detail.member.telegramUsername
                ? `@${detail.member.telegramUsername}`
                : "No username"}{" "}
              - Telegram ID {detail.member.telegramId}
            </p>
          </div>
          <Link
            href="/admin/members"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#b8cac5] px-4 text-sm font-semibold text-[#183f3c]"
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
                  placeholder="Used later where Hi.Events or Stripe require it"
                  className="h-10 rounded-md border border-[#b8cac5] px-3"
                />
              </label>
              <button
                type="submit"
                className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
              >
                Save contact
              </button>
            </form>
          </Panel>

          <Panel title="Tags">
            {detail.tags.length === 0 ? (
              <p className="text-sm text-[#64706c]">No tags assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag) => (
                  <form key={tag.id} action={removeMemberTagAction}>
                    <input
                      type="hidden"
                      name="memberId"
                      value={detail.member.id}
                    />
                    <input type="hidden" name="tagId" value={tag.id} />
                    <button type="submit" className="max-w-full text-left">
                      <TagBadge tag={tag} suffix="x" />
                    </button>
                  </form>
                ))}
              </div>
            )}

            <form action={assignExistingMemberTagAction} className="mt-4 grid gap-3">
              <input type="hidden" name="memberId" value={detail.member.id} />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Assign existing tag</span>
                <select
                  name="tagId"
                  disabled={assignableTags.length === 0}
                  className="h-10 rounded-md border border-[#b8cac5] bg-white px-3 disabled:bg-[#eef3f1]"
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
                className="h-10 rounded-md border border-[#b8cac5] px-4 text-sm font-semibold text-[#183f3c] disabled:cursor-not-allowed disabled:text-[#8a9692]"
              >
                Assign tag
              </button>
            </form>

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
                    className="h-10 rounded-md border border-[#b8cac5] px-3"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Color</span>
                  <select
                    name="color"
                    defaultValue="gray"
                    className="h-10 rounded-md border border-[#b8cac5] bg-white px-3"
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
                className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
              >
                Create and assign
              </button>
            </form>
          </Panel>

          <Panel title="Internal Notes">
            <form action={createMemberNoteAction} className="grid gap-3">
              <input type="hidden" name="memberId" value={detail.member.id} />
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Organizer-only note"
                className="min-h-28 rounded-md border border-[#b8cac5] px-3 py-2 leading-6"
              />
              <button
                type="submit"
                className="h-10 rounded-md bg-[#183f3c] px-4 text-sm font-semibold text-white"
              >
                Add note
              </button>
            </form>

            {detail.notes.length === 0 ? (
              <p className="mt-4 text-sm text-[#64706c]">No notes yet.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {detail.notes.map(({ note, author }) => (
                  <article key={note.id} className="border border-[#d7e3df] p-4">
                    <p className="whitespace-pre-wrap leading-6">{note.body}</p>
                    <p className="mt-3 text-xs text-[#64706c]">
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
          <Panel title="RSVP History">
            {detail.rsvps.length === 0 ? (
              <p className="text-sm text-[#64706c]">No RSVPs yet.</p>
            ) : (
              <div className="grid gap-3">
                {detail.rsvps.map(({ rsvp, event }) => (
                  <article key={rsvp.id} className="border border-[#d7e3df] p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{rsvp.status}</Badge>
                      <Badge>
                        {event.type === "annual_retreat" ? "annual" : "mini"}
                      </Badge>
                      <Badge>{event.status}</Badge>
                    </div>
                    <h3 className="mt-3 font-semibold">{event.title}</h3>
                    <p className="mt-1 text-sm text-[#64706c]">
                      {formatDate(event.startsAt)}
                    </p>
                    {rsvp.ticketType ? (
                      <p className="mt-2 text-sm text-[#64706c]">
                        Ticket: {rsvp.ticketType}
                      </p>
                    ) : null}
                    {rsvp.hiEventsOrderId || rsvp.hiEventsAttendeeId ? (
                      <p className="mt-2 break-all text-sm text-[#64706c]">
                        {rsvp.hiEventsOrderId
                          ? `Hi.Events order ${rsvp.hiEventsOrderId}`
                          : null}
                        {rsvp.hiEventsOrderId && rsvp.hiEventsAttendeeId
                          ? " - "
                          : null}
                        {rsvp.hiEventsAttendeeId
                          ? `attendee ${rsvp.hiEventsAttendeeId}`
                          : null}
                      </p>
                    ) : null}
                    {rsvp.hiEventsCheckoutUrl ? (
                      <a
                        href={rsvp.hiEventsCheckoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-sm font-semibold text-[#183f3c]"
                      >
                        Checkout link
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Survey Responses">
            {detail.surveyResponses.length === 0 ? (
              <p className="text-sm text-[#64706c]">No survey responses yet.</p>
            ) : (
              <div className="grid gap-3">
                {detail.surveyResponses.map(({ response, survey, event }) => (
                  <article
                    key={response.id}
                    className="border border-[#d7e3df] p-4"
                  >
                    <h3 className="font-semibold">{survey.title}</h3>
                    {event ? (
                      <p className="mt-1 text-sm text-[#64706c]">
                        Linked to {event.title}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-[#64706c]">
                      Updated {formatDate(response.updatedAt)}
                    </p>
                    <dl className="mt-4 grid gap-3">
                      {formatSurveyResponse(
                        response.answersJson,
                        survey.schemaJson,
                      ).map(({ label, answer }) => (
                        <div key={label}>
                          <dt className="text-xs uppercase tracking-[0.14em] text-[#6b746f]">
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
    </MemberProfileShell>
  );
}

function MemberProfileShell({
  children,
  memberName,
}: {
  children: React.ReactNode;
  memberName?: string;
}) {
  return (
    <main className="min-h-screen bg-[#14211f] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-semibold">
            ARF
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-white/70">
            {memberName ? <span>{memberName}</span> : null}
            <Link href="/admin/members">Members</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
        <div className="mt-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8b35a]">
            Member profile
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            CRM-lite details for ARF organizers.
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

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border border-white/15 bg-white p-5 text-[#1d2523]">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#e3ece9] bg-[#f8fbff] p-3 text-[#1d2523]">
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

function TagBadge({
  suffix,
  tag,
}: {
  suffix?: string;
  tag: { name: string; color: string };
}) {
  return (
    <span
      className={`inline-block max-w-full break-all rounded-md px-3 py-1 text-xs font-semibold ${tagToneClass(
        tag.color,
      )}`}
    >
      {tag.name}
      {suffix ? <span className="ml-2 font-mono">{suffix}</span> : null}
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
