import {
  and,
  asc,
  count,
  desc,
  eq,
  events,
  getDb,
  inArray,
  members,
  sql,
  surveyResponses,
  surveys,
  type Event,
  type Member,
  type Survey,
  type SurveyResponse,
} from "@cego/db";

export interface SurveyQuestion {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "select";
  options?: string[];
}

export interface SurveySchema {
  questions: SurveyQuestion[];
}

export interface DashboardSurvey {
  survey: Survey;
  event?: Pick<Event, "id" | "title" | "startsAt">;
  schema: SurveySchema;
  response?: SurveyResponse;
}

export interface AdminSurveyOverview {
  survey: Survey;
  event?: Pick<Event, "id" | "title" | "startsAt">;
  schema: SurveySchema;
  responseCount: number;
  responses: Array<{
    response: SurveyResponse;
    member: Pick<Member, "id" | "telegramDisplayName" | "telegramUsername">;
  }>;
}

export async function getDashboardSurveys(
  memberId: string,
): Promise<DashboardSurvey[]> {
  const db = getDb();
  const surveyRows = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.status, "published"), sql`${surveys.eventId} IS NULL`))
    .orderBy(asc(surveys.createdAt));

  const visibleSurveys = surveyRows;

  if (visibleSurveys.length === 0) {
    return [];
  }

  const surveyIds = visibleSurveys.map((survey) => survey.id);
  const eventIds = visibleSurveys
    .map((survey) => survey.eventId)
    .filter((eventId): eventId is string => Boolean(eventId));

  const [responseRows, eventRows] = await Promise.all([
    db
      .select()
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.memberId, memberId),
          inArray(surveyResponses.surveyId, surveyIds),
        ),
      ),
    eventIds.length > 0
      ? db
          .select({
            id: events.id,
            title: events.title,
            startsAt: events.startsAt,
          })
          .from(events)
          .where(inArray(events.id, eventIds))
      : [],
  ]);

  const responsesBySurvey = new Map(
    responseRows.map((response) => [response.surveyId, response]),
  );
  const eventsById = new Map(eventRows.map((event) => [event.id, event]));

  return visibleSurveys.map((survey) => ({
    survey,
    event: survey.eventId ? eventsById.get(survey.eventId) : undefined,
    schema: parseSurveySchema(survey.schemaJson),
    response: responsesBySurvey.get(survey.id),
  }));
}

export async function getAdminSurveys(): Promise<AdminSurveyOverview[]> {
  const db = getDb();
  const surveyRows = await db
    .select()
    .from(surveys)
    .orderBy(desc(surveys.createdAt));

  if (surveyRows.length === 0) {
    return [];
  }

  const surveyIds = surveyRows.map((survey) => survey.id);
  const eventIds = surveyRows
    .map((survey) => survey.eventId)
    .filter((eventId): eventId is string => Boolean(eventId));

  const [responseCountRows, responseRows, eventRows] = await Promise.all([
    db
      .select({
        surveyId: surveyResponses.surveyId,
        total: count(),
      })
      .from(surveyResponses)
      .where(inArray(surveyResponses.surveyId, surveyIds))
      .groupBy(surveyResponses.surveyId),
    db
      .select({
        response: surveyResponses,
        member: {
          id: members.id,
          telegramDisplayName: members.telegramDisplayName,
          telegramUsername: members.telegramUsername,
        },
      })
      .from(surveyResponses)
      .innerJoin(members, eq(surveyResponses.memberId, members.id))
      .where(inArray(surveyResponses.surveyId, surveyIds))
      .orderBy(desc(surveyResponses.submittedAt)),
    eventIds.length > 0
      ? db
          .select({
            id: events.id,
            title: events.title,
            startsAt: events.startsAt,
          })
          .from(events)
          .where(inArray(events.id, eventIds))
      : [],
  ]);

  const countsBySurvey = new Map(
    responseCountRows.map((row) => [row.surveyId, Number(row.total)]),
  );
  const eventsById = new Map(eventRows.map((event) => [event.id, event]));
  const responsesBySurvey = new Map<string, AdminSurveyOverview["responses"]>();

  for (const row of responseRows) {
    const current = responsesBySurvey.get(row.response.surveyId) ?? [];
    current.push(row);
    responsesBySurvey.set(row.response.surveyId, current);
  }

  return surveyRows.map((survey) => ({
    survey,
    event: survey.eventId ? eventsById.get(survey.eventId) : undefined,
    schema: parseSurveySchema(survey.schemaJson),
    responseCount: countsBySurvey.get(survey.id) ?? 0,
    responses: responsesBySurvey.get(survey.id) ?? [],
  }));
}

export function parseSurveySchema(value: unknown): SurveySchema {
  if (
    typeof value === "object" &&
    value !== null &&
    "questions" in value &&
    Array.isArray(value.questions)
  ) {
    const questions = value.questions.flatMap((question) => {
      if (
        typeof question !== "object" ||
        question === null ||
        !("id" in question) ||
        !("label" in question)
      ) {
        return [];
      }

      const id = String(question.id);
      const label = String(question.label);

      if (!id || !label) {
        return [];
      }

      const type = "type" in question && (question.type === "text" || question.type === "select")
        ? question.type
        : "text";
      const rawOptions = "options" in question && Array.isArray(question.options)
        ? (question.options as unknown[]).filter((o): o is string => typeof o === "string")
        : [];
      const options = type === "select" ? rawOptions : undefined;

      return {
        id,
        label,
        required:
          "required" in question ? Boolean(question.required) : false,
        type,
        ...(options && options.length > 0 ? { options } : {}),
      };
    });

    return { questions };
  }

  return { questions: [] };
}

export function formatSurveyAnswer(value: unknown): string {
  if (typeof value === "string") {
    return value || "No answer";
  }

  if (value === null || value === undefined) {
    return "No answer";
  }

  return JSON.stringify(value);
}
