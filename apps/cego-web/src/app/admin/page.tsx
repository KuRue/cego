import Image from "next/image";
import Link from "next/link";
import {
  createEventAction,
  updateEventAction,
  updateRsvpStatusAction,
} from "@/lib/event-actions";
import { getAdminEvents, type AdminEventWithRsvps } from "@/lib/events";
import { getCurrentMember } from "@/lib/session";
import {
  createSurveyAction,
  updateSurveyAction,
} from "@/lib/survey-actions";
import {
  formatSurveyAnswer,
  getAdminSurveys,
  type AdminSurveyOverview,
  type SurveySchema,
} from "@/lib/surveys";
import { Badge, StatusBadge } from "@/components/badge";
import Navbar from "@/components/navbar";
import { getSiteSettings, type BrandSettings } from "@/lib/settings";
import { updateSiteSettingsAction } from "@/lib/settings-actions";
import LogoUpload from "./settings/logo-upload";

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

  const [eventOverviews, surveyOverviews] = await Promise.all([
    getAdminEvents(),
    getAdminSurveys(),
  ]);
  const adminEvents = eventOverviews.map(({ event }) => event);

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
        <section>
          <h1 className="text-3xl font-semibold">Admin</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            Manage events, capacity, waitlists, surveys, and RSVP state.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2">
            <AdminNavLink href="#events">Events</AdminNavLink>
            <AdminNavLink href="#surveys">Surveys</AdminNavLink>
            <AdminNavLink href="#settings">Settings</AdminNavLink>
          </nav>
        </section>

        <section id="events" className="mt-8 grid scroll-mt-24 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <CreateEventPanel />
          <div className="grid gap-4">
            <div className="glass rounded-2xl p-5">
              <p
                className="font-mono text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--color-highlight)" }}
              >
                Events
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                {eventOverviews.length} event{eventOverviews.length === 1 ? "" : "s"}
              </h2>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
                Draft and archived events are hidden from members.
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p
                className="font-mono text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--color-highlight)" }}
              >
                Surveys
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                {surveyOverviews.length} survey{surveyOverviews.length === 1 ? "" : "s"}
              </h2>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
                Published general surveys are visible to all group members.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">RSVP operations</h2>
        </section>

        <section className="mt-5 grid gap-5">
          {eventOverviews.length === 0 ? (
            <div className="glass-lg rounded-2xl p-8 text-center">
              <p className="font-medium">No events yet</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Create the first event to start testing RSVP behavior.
              </p>
            </div>
          ) : (
            eventOverviews.map((overview) => (
              <AdminEventCard key={overview.event.id} overview={overview} />
            ))
          )}
        </section>

        <section id="surveys" className="mt-10 grid scroll-mt-24 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <CreateSurveyPanel events={adminEvents} />
          <div className="glass rounded-2xl p-5">
            <p
              className="font-mono text-xs uppercase tracking-[0.2em]"
              style={{ color: "var(--color-highlight)" }}
            >
              Preferences
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Survey operations</h2>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
              One question per line. Prefix with * to make it required.
            </p>
          </div>
        </section>

        <section className="mt-5 grid gap-5">
          {surveyOverviews.length === 0 ? (
            <div className="glass-lg rounded-2xl p-8 text-center">
              <p className="font-medium">No surveys yet</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Create a survey to collect member preferences.
              </p>
            </div>
          ) : (
            surveyOverviews.map((overview) => (
              <AdminSurveyCard
                key={overview.survey.id}
                events={adminEvents}
                overview={overview}
              />
            ))
          )}
        </section>

        <section id="settings" className="mt-10 scroll-mt-24">
          <SettingsPanel settings={settings} />
        </section>
      </main>
    </>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="glass glass-hover inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition"
    >
      {children}
    </a>
  );
}

function CreateEventPanel() {
  return (
    <details className="glass-lg rounded-2xl p-5">
      <summary className="cursor-pointer list-none">
        <span className="text-2xl font-semibold">Create event</span>
        <span className="mt-2 block text-sm" style={{ color: "var(--color-muted)" }}>
          Open this when you are ready to add a major event or local event.
        </span>
      </summary>
      <EventForm action={createEventAction} submitLabel="Create event" />
    </details>
  );
}

function CreateSurveyPanel({
  events,
}: {
  events: AdminEventWithRsvps["event"][];
}) {
  return (
    <details className="glass-lg rounded-2xl p-5">
      <summary className="cursor-pointer list-none">
        <span className="text-2xl font-semibold">Create survey</span>
        <span className="mt-2 block text-sm" style={{ color: "var(--color-muted)" }}>
          Open this when you need to collect member or event preferences.
        </span>
      </summary>
      <SurveyForm action={createSurveyAction} events={events} submitLabel="Create survey" />
    </details>
  );
}

function SettingsPanel({ settings }: { settings: BrandSettings }) {
  return (
    <div className="glass-lg rounded-2xl p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="font-mono text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--color-highlight)" }}
          >
            Site settings
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Branding and homepage</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            These settings stay inside the organizer console and update the public shell.
          </p>
        </div>
      </div>

      <form action={updateSiteSettingsAction} className="mt-6 grid gap-6">
        <input type="hidden" name="returnTo" value="/admin#settings" />

        <section className="grid gap-4 lg:grid-cols-3">
          <Field label="Site name">
            <input name="siteName" defaultValue={settings.siteName} className="form-input" />
          </Field>
          <Field label="Tagline">
            <input name="tagline" defaultValue={settings.tagline} className="form-input" />
          </Field>
          <Field label="Footer text">
            <input name="footerText" defaultValue={settings.footerText} className="form-input" />
          </Field>
        </section>

        <section className="glass rounded-xl p-4">
          <h3 className="font-semibold">Logo</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            PNG, JPEG, WebP, or SVG under 2 MB.
          </p>
          <div className="mt-4">
            {settings.logoUrl ? (
              <div className="flex items-center gap-4">
                <Image
                  src={settings.logoUrl}
                  alt="Site logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <Badge>Current logo</Badge>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No logo uploaded. The default letter will be used.
              </p>
            )}
            <LogoUpload currentLogoUrl={settings.logoUrl} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Field label="Accent (light)">
            <input
              type="color"
              name="accentColor"
              defaultValue={settings.accentColor}
              className="h-10 w-16 cursor-pointer rounded-xl border-0 p-1"
            />
          </Field>
          <Field label="Accent (dark)">
            <input
              type="color"
              name="accentColorDark"
              defaultValue={settings.accentColorDark}
              className="h-10 w-16 cursor-pointer rounded-xl border-0 p-1"
            />
          </Field>
          <Field label="Highlight">
            <input
              type="color"
              name="highlightColor"
              defaultValue={settings.highlightColor}
              className="h-10 w-16 cursor-pointer rounded-xl border-0 p-1"
            />
          </Field>
        </section>

        <Field label="Hero title">
          <textarea
            name="heroTitle"
            defaultValue={settings.heroTitle}
            rows={2}
            className="form-textarea"
          />
        </Field>
        <Field label="Hero body">
          <textarea
            name="heroBody"
            defaultValue={settings.heroBody}
            rows={3}
            className="form-textarea"
          />
        </Field>

        <button
          type="submit"
          className="h-11 rounded-xl px-5 text-sm font-semibold transition sm:w-fit"
          style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
        >
          Save settings
        </button>
      </form>
    </div>
  );
}

function AdminEventCard({ overview }: { overview: AdminEventWithRsvps }) {
  const { event, confirmedCount, waitlistedCount, rsvps } = overview;

  return (
    <article className="glass-lg rounded-2xl p-5">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{event.type === "major_event" ? "Major" : "Local"}</Badge>
            <StatusBadge status={event.status} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{event.title}</h2>
          {event.description ? (
            <p className="mt-3 leading-7" style={{ color: "var(--color-muted)" }}>
              {event.description}
            </p>
          ) : null}
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            {formatDateRange(event.startsAt, event.endsAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {event.priceCents !== null ? <Badge>{formatPrice(event.priceCents, event.currency)}</Badge> : null}
            {event.paymentRequired ? <Badge>Payment required</Badge> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Capacity" value={`${confirmedCount}/${event.capacity}`} />
            <Metric label="Waitlist" value={String(waitlistedCount)} />
          </div>
        </div>

        <details className="glass rounded-xl p-4">
          <summary className="cursor-pointer list-none font-semibold">Edit event</summary>
          <EventForm action={updateEventAction} submitLabel="Save event" event={event} />
        </details>
      </div>

      <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
        <h3 className="font-semibold">RSVPs</h3>
        {rsvps.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>No RSVPs yet.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {rsvps.map(({ rsvp, member }) => (
              <div key={rsvp.id} className="glass rounded-xl p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="font-medium">{member.telegramDisplayName}</p>
                    <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                      {member.telegramUsername ? `@${member.telegramUsername}` : member.email || member.groupStatus}
                    </p>
                    {member.email ? (
                      <p className="mt-1 break-all text-sm" style={{ color: "var(--color-muted)" }}>{member.email}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge status={rsvp.status} />
                    </div>
                  </div>
                  <form action={updateRsvpStatusAction} className="grid gap-2 sm:grid-cols-[auto_auto]">
                    <input type="hidden" name="rsvpId" value={rsvp.id} />
                    <select
                      name="status"
                      defaultValue={rsvp.status}
                      className="h-10 rounded-xl px-3 text-sm outline-none"
                      style={{
                        background: "var(--color-surface-hover)",
                        border: "1px solid var(--color-surface-border)",
                      }}
                    >
                      <option value="confirmed">confirmed</option>
                      <option value="waitlisted">waitlisted</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <button
                      type="submit"
                      className="h-10 rounded-xl px-4 text-sm font-semibold transition"
                      style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
                    >
                      Update
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function AdminSurveyCard({
  events,
  overview,
}: {
  events: AdminEventWithRsvps["event"][];
  overview: AdminSurveyOverview;
}) {
  const { survey, event, schema, responseCount, responses } = overview;

  return (
    <article className="glass-lg rounded-2xl p-5">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={survey.status} />
            <Badge>{event ? "event survey" : "member survey"}</Badge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold">{survey.title}</h2>
          {survey.description ? (
            <p className="mt-2 leading-7" style={{ color: "var(--color-muted)" }}>{survey.description}</p>
          ) : null}
          {event ? (
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Linked to {event.title} on {formatDateRange(event.startsAt, null)}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Questions" value={String(schema.questions.length)} />
            <Metric label="Responses" value={String(responseCount)} />
          </div>
        </div>

        <details className="glass rounded-xl p-4">
          <summary className="cursor-pointer list-none font-semibold">Edit survey</summary>
          <SurveyForm action={updateSurveyAction} events={events} overview={overview} submitLabel="Save survey" />
        </details>
      </div>

      <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
        <h3 className="font-semibold">Responses</h3>
        {responses.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>No responses yet.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {responses.map(({ response, member }) => {
              const answers = readAnswerRecord(response.answersJson);
              return (
                <div key={response.id} className="glass rounded-xl p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{member.telegramDisplayName}</p>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                        {member.telegramUsername ? `@${member.telegramUsername}` : member.id}
                      </p>
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                      {formatResponseDate(response.updatedAt)}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-3">
                    {schema.questions.map((question) => (
                      <div key={question.id}>
                        <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--color-muted)" }}>
                          {question.label}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6">
                          {formatSurveyAnswer(answers[question.id])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

function EventForm({
  action,
  submitLabel,
  event,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  event?: AdminEventWithRsvps["event"];
}) {
  return (
    <form action={action} className="mt-4 grid gap-4">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <select name="type" defaultValue={event?.type ?? "local_event"} className="form-select">
            <option value="major_event">major_event</option>
            <option value="local_event">local_event</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={event?.status ?? "draft"} className="form-select">
            <option value="draft">draft</option>
            <option value="open">open</option>
            <option value="full">full</option>
            <option value="closed">closed</option>
            <option value="archived">archived</option>
          </select>
        </Field>
      </div>
      <Field label="Title">
        <input name="title" required defaultValue={event?.title} className="form-input" />
      </Field>
      <Field label="Description">
        <textarea
          name="description"
          defaultValue={event?.description ?? ""}
          rows={4}
          className="form-textarea"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Slug">
          <input name="slug" required defaultValue={event?.slug} className="form-input" />
        </Field>
        <Field label="Capacity">
          <input name="capacity" required type="number" min="1" defaultValue={event?.capacity ?? 12} className="form-input" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts">
          <input name="startsAt" required type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.startsAt) : ""} className="form-input" />
        </Field>
        <Field label="Ends">
          <input name="endsAt" type="datetime-local" defaultValue={event ? toDateTimeLocalValue(event.endsAt) : ""} className="form-input" />
        </Field>
      </div>
      <Field label="Location text">
        <input name="locationText" defaultValue={event?.locationText ?? ""} className="form-input" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_0.7fr_auto]">
        <Field label="Price">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={event?.priceCents !== null && event?.priceCents !== undefined ? (event.priceCents / 100).toFixed(2) : ""}
            className="form-input"
          />
        </Field>
        <Field label="Currency">
          <input
            name="currency"
            maxLength={3}
            defaultValue={event?.currency ?? "USD"}
            className="form-input uppercase"
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            name="paymentRequired"
            type="checkbox"
            defaultChecked={event?.paymentRequired ?? false}
            className="h-4 w-4"
          />
          <span className="font-medium">Payment required</span>
        </label>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Rules">
          <textarea
            name="rulesText"
            defaultValue={event?.rulesText ?? ""}
            rows={4}
            className="form-textarea"
          />
        </Field>
        <Field label="Terms">
          <textarea
            name="termsText"
            defaultValue={event?.termsText ?? ""}
            rows={4}
            className="form-textarea"
          />
        </Field>
      </div>
      <Field label="Cancellation/refund policy">
        <textarea
          name="refundPolicyText"
          defaultValue={event?.refundPolicyText ?? ""}
          rows={3}
          className="form-textarea"
        />
      </Field>
      <Field label="Organizer notes">
        <textarea
          name="organizerNotes"
          defaultValue={event?.organizerNotes ?? ""}
          rows={3}
          className="form-textarea"
        />
      </Field>
      <button
        type="submit"
        className="h-11 rounded-xl px-5 text-sm font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        {submitLabel}
      </button>
    </form>
  );
}

function SurveyForm({
  action,
  events,
  overview,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  events: AdminEventWithRsvps["event"][];
  overview?: AdminSurveyOverview;
  submitLabel: string;
}) {
  const survey = overview?.survey;

  return (
    <form action={action} className="mt-4 grid gap-4">
      {survey ? <input type="hidden" name="surveyId" value={survey.id} /> : null}
      <Field label="Scope">
        <select name="eventId" defaultValue={survey?.eventId ?? ""} className="form-select">
          <option value="">General member survey</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input name="title" required defaultValue={survey?.title} className="form-input" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={survey?.status ?? "draft"} className="form-select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="closed">closed</option>
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={survey?.description ?? ""} rows={3} className="form-textarea" />
      </Field>
      <Field label="Questions">
        <textarea
          name="questions"
          required
          defaultValue={overview ? surveyQuestionsToText(overview.schema) : "*Room preference?"}
          rows={5}
          className="form-textarea"
        />
      </Field>
      <button
        type="submit"
        className="h-11 rounded-xl px-5 text-sm font-semibold transition"
        style={{ background: "var(--color-accent)", color: "var(--color-on-accent)" }}
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
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

function formatDateRange(startsAt: Date, endsAt: Date | null): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) return formatter.format(startsAt);
  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
}

function toDateTimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function surveyQuestionsToText(schema: SurveySchema): string {
  return schema.questions
    .map((question) => `${question.required ? "*" : ""}${question.label}`)
    .join("\n");
}

function readAnswerRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  return {};
}

function formatResponseDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
