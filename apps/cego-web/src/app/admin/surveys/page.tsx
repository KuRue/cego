import {
  createSurveyAction,
  updateSurveyAction,
} from "@/lib/survey-actions";
import AppLink from "@/components/app-link";
import {
  formatSurveyAnswer,
  getAdminSurveys,
  type AdminSurveyOverview,
  type SurveySchema,
} from "@/lib/surveys";
import { getAdminEvents } from "@/lib/events";
import { requireAdminMember } from "@/lib/session";
import Navbar from "@/components/navbar";
import { Badge, StatusBadge } from "@/components/badge";
import { getNavbarBrand } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Surveys",
};

export default async function AdminSurveysPage() {
  const member = await requireAdminMember();
  const brand = await getNavbarBrand();
  const [surveyOverviews, eventOverviews] = await Promise.all([
    getAdminSurveys(),
    getAdminEvents(),
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
        <div className="flex items-center justify-between">
          <div>
            <AppLink
              href="/admin"
              className="text-sm font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              &larr; Admin
            </AppLink>
            <h1 className="mt-1 text-3xl font-semibold">Surveys</h1>
          </div>
        </div>

        <details className="glass-lg mt-8 rounded-2xl p-5">
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
            Create new survey
          </summary>
          <SurveyForm action={createSurveyAction} events={adminEvents} submitLabel="Create survey" />
        </details>

        <div className="mt-8 grid gap-5">
          {surveyOverviews.length === 0 ? (
            <div className="glass-lg rounded-2xl p-8 text-center">
              <p className="font-medium">No surveys yet</p>
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                Create a survey to collect member preferences.
              </p>
            </div>
          ) : (
            surveyOverviews.map((overview) => (
              <SurveyCard key={overview.survey.id} events={adminEvents} overview={overview} />
            ))
          )}
        </div>
      </main>
    </>
  );
}

function SurveyCard({
  events,
  overview,
}: {
  events: { id: string; title: string }[];
  overview: AdminSurveyOverview;
}) {
  const { survey, event, schema, responseCount, responses } = overview;

  return (
    <article className="glass-lg rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={survey.status} />
            <Badge>{event ? "Event survey" : "Member survey"}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{survey.title}</h2>
          {survey.description ? (
            <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
              {survey.description}
            </p>
          ) : null}
          {event ? (
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Linked to {event.title}
            </p>
          ) : null}
          <div className="mt-3 flex gap-4 text-sm">
            <span>{schema.questions.length} question{schema.questions.length === 1 ? "" : "s"}</span>
            <span>{responseCount} response{responseCount === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <details className="mt-5 pt-5" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
          Edit survey
        </summary>
        <SurveyForm action={updateSurveyAction} events={events} overview={overview} submitLabel="Save survey" />
      </details>

      {responses.length > 0 ? (
        <details className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-surface-border)" }}>
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
            Responses ({responses.length})
          </summary>
          <div className="mt-4 grid gap-3">
            {responses.map(({ response, member: m }) => {
              const answers = readAnswerRecord(response.answersJson);
              return (
                <div key={response.id} className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{m.telegramDisplayName}</p>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                        {m.telegramUsername ? `@${m.telegramUsername}` : m.id}
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
        </details>
      ) : null}
    </article>
  );
}

function SurveyForm({
  action,
  events,
  overview,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  events: { id: string; title: string }[];
  overview?: AdminSurveyOverview;
  submitLabel: string;
}) {
  const survey = overview?.survey;

  return (
    <form action={action} className="mt-4 grid gap-4">
      {survey ? <input type="hidden" name="surveyId" value={survey.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Scope">
          <select name="eventId" defaultValue={survey?.eventId ?? ""} className="form-select">
            <option value="">General member survey</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={survey?.status ?? "draft"} className="form-select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="closed">closed</option>
          </select>
        </Field>
      </div>
      <Field label="Title">
        <input name="title" required defaultValue={survey?.title} className="form-input" />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={survey?.description ?? ""} rows={3} className="form-textarea" />
      </Field>
      <Field label="Questions (one per line, prefix * for required)">
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
        className="h-11 rounded-xl px-5 text-sm font-semibold transition sm:w-fit"
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
