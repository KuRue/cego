import {
  and,
  count,
  desc,
  eq,
  eventExpenses,
  events,
  getDb,
  inArray,
  members,
  ne,
  rsvps,
  surveyResponses,
  surveys,
  type Event,
  type Member,
  type Rsvp,
} from "@cego/db";
import { parseSurveySchema, type SurveySchema } from "@/lib/surveys";

export type EffectiveRsvpStatus = "before" | "open" | "full" | "closed" | "past";

export function getEffectiveRsvpStatus(event: {
  status: string;
  startsAt: Date;
  rsvpOpensAt: Date | null;
  rsvpClosesAt: Date | null;
  capacity: number;
  confirmedCount: number;
}): EffectiveRsvpStatus {
  const now = Date.now();

  if (event.status === "draft" || event.status === "archived") {
    return "before";
  }

  if (event.status === "closed") {
    return "closed";
  }

  if (event.rsvpClosesAt && event.rsvpClosesAt.getTime() <= now) {
    return "closed";
  }

  if (event.rsvpOpensAt && event.rsvpOpensAt.getTime() > now) {
    return "before";
  }

  if (event.startsAt.getTime() <= now) {
    return "past";
  }

  if (event.confirmedCount >= event.capacity) {
    return "full";
  }

  return "open";
}

export interface EventWithRsvpState {
  event: Event;
  confirmedCount: number;
  waitlistedCount: number;
  rsvp?: Rsvp;
  plusOne?: Rsvp;
  rsvpMembers: Array<{
    telegramDisplayName: string;
    telegramPhotoUrl: string | null;
  }>;
  survey?: {
    id: string;
    title: string;
    schema: SurveySchema;
    response?: {
      answersJson: unknown;
    };
  };
}

export interface PublicEvent {
  event: Event;
  confirmedCount: number;
  waitlistedCount: number;
  rsvpMembers: Array<{
    telegramDisplayName: string;
    telegramPhotoUrl: string | null;
  }>;
}

export interface AdminEventWithRsvps {
  event: Event;
  confirmedCount: number;
  waitlistedCount: number;
  rsvps: Array<{
    rsvp: Rsvp;
    member: Pick<
      Member,
      "id" | "telegramDisplayName" | "telegramUsername" | "groupStatus" | "email"
    >;
  }>;
}

const capacityBearingStatuses = ["pending_payment", "confirmed"] as const;

export async function getDashboardEvents(
  memberId: string,
): Promise<EventWithRsvpState[]> {
  const db = getDb();
  const eventRows = await db
    .select()
    .from(events)
    .where(inArray(events.status, ["show", "closed"]))
    .orderBy(desc(events.startsAt));

  if (eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((event) => event.id);
  const [memberRsvpRows, countRows, rsvpMemberRows] = await Promise.all([
    db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.memberId, memberId), inArray(rsvps.eventId, eventIds))),
    getRsvpCountRows(eventIds),
    db
      .select({
        eventId: rsvps.eventId,
        telegramDisplayName: members.telegramDisplayName,
        telegramPhotoUrl: members.telegramPhotoUrl,
      })
      .from(rsvps)
      .innerJoin(members, eq(rsvps.memberId, members.id))
      .where(
        and(
          inArray(rsvps.eventId, eventIds),
          inArray(rsvps.status, ["confirmed"]),
        ),
      ),
  ]);

  const memberRsvpsByEvent = new Map(
    memberRsvpRows
      .filter((r) => !r.parentRsvpId)
      .map((rsvp) => [rsvp.eventId, rsvp]),
  );
  const plusOneByEvent = new Map(
    memberRsvpRows
      .filter((r) => r.parentRsvpId)
      .map((rsvp) => [rsvp.eventId, rsvp]),
  );
  const countsByEvent = toCountMap(countRows);
  const rsvpMembersByEvent = new Map<string, EventWithRsvpState["rsvpMembers"]>();
  for (const row of rsvpMemberRows) {
    const list = rsvpMembersByEvent.get(row.eventId) ?? [];
    list.push({ telegramDisplayName: row.telegramDisplayName, telegramPhotoUrl: row.telegramPhotoUrl });
    rsvpMembersByEvent.set(row.eventId, list);
  }

  return eventRows.map((event) => ({
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvp: memberRsvpsByEvent.get(event.id),
    plusOne: plusOneByEvent.get(event.id),
    rsvpMembers: rsvpMembersByEvent.get(event.id) ?? [],
  }));
}

export async function getDashboardEventBySlug(
  memberId: string,
  slug: string,
): Promise<EventWithRsvpState | null> {
  const db = getDb();
  const eventRows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.slug, slug),
        inArray(events.status, ["show", "closed"]),
      ),
    )
    .limit(1);
  const event = eventRows[0];

  if (!event) {
    return null;
  }

  const [memberRsvpRows, countRows, rsvpMemberRows, surveyRows, surveyResponseRows] = await Promise.all([
    db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.memberId, memberId), eq(rsvps.eventId, event.id))),
    getRsvpCountRows([event.id]),
    db
      .select({
        telegramDisplayName: members.telegramDisplayName,
        telegramPhotoUrl: members.telegramPhotoUrl,
      })
      .from(rsvps)
      .innerJoin(members, eq(rsvps.memberId, members.id))
      .where(
        and(
          eq(rsvps.eventId, event.id),
          inArray(rsvps.status, ["confirmed"]),
        ),
      ),
    db
      .select()
      .from(surveys)
      .where(and(eq(surveys.eventId, event.id), eq(surveys.status, "published")))
      .limit(1),
    db
      .select({
        surveyId: surveyResponses.surveyId,
        answersJson: surveyResponses.answersJson,
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.memberId, memberId),
          eq(surveyResponses.eventId, event.id),
        ),
      ),
  ]);
  const countsByEvent = toCountMap(countRows);
  const parentRsvp = memberRsvpRows.find((r) => !r.parentRsvpId);
  const plusOne = memberRsvpRows.find((r) => r.parentRsvpId);

  const survey = surveyRows[0];
  const surveyResponse = surveyResponseRows.find((r) => r.surveyId === survey?.id);

  const surveyData: EventWithRsvpState["survey"] = survey
    ? {
        id: survey.id,
        title: survey.title,
        schema: parseSurveySchema(survey.schemaJson),
        response: surveyResponse ? { answersJson: surveyResponse.answersJson } : undefined,
      }
    : undefined;

  return {
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvp: parentRsvp,
    plusOne,
    rsvpMembers: rsvpMemberRows.map((r) => ({
      telegramDisplayName: r.telegramDisplayName,
      telegramPhotoUrl: r.telegramPhotoUrl,
    })),
    survey: surveyData,
  };
}

export async function getAdminEvents(): Promise<AdminEventWithRsvps[]> {
  return getAdminEventsFiltered(ne(events.status, "deleted"));
}

export async function getAdminDeletedEvents(): Promise<AdminEventWithRsvps[]> {
  return getAdminEventsFiltered(eq(events.status, "deleted"));
}

async function getAdminEventsFiltered(
  condition: ReturnType<typeof eq> | ReturnType<typeof ne>,
): Promise<AdminEventWithRsvps[]> {
  const db = getDb();
  const eventRows = await db.select().from(events).where(condition).orderBy(desc(events.startsAt));

  if (eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((event) => event.id);
  const [countRows, rsvpRows] = await Promise.all([
    getRsvpCountRows(eventIds),
    db
      .select({
        rsvp: rsvps,
        member: {
          id: members.id,
          telegramDisplayName: members.telegramDisplayName,
          telegramUsername: members.telegramUsername,
          groupStatus: members.groupStatus,
          email: members.email,
        },
      })
      .from(rsvps)
      .innerJoin(members, eq(rsvps.memberId, members.id))
      .where(inArray(rsvps.eventId, eventIds))
      .orderBy(desc(rsvps.createdAt)),
  ]);

  const countsByEvent = toCountMap(countRows);
  const rsvpsByEvent = new Map<string, AdminEventWithRsvps["rsvps"]>();

  for (const row of rsvpRows) {
    const existing = rsvpsByEvent.get(row.rsvp.eventId) ?? [];
    existing.push(row);
    rsvpsByEvent.set(row.rsvp.eventId, existing);
  }

  return eventRows.map((event) => ({
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvps: rsvpsByEvent.get(event.id) ?? [],
  }));
}

export async function getPublicEvents(): Promise<{
  upcoming: PublicEvent[];
  past: PublicEvent[];
}> {
  const db = getDb();
  const eventRows = await db
    .select()
    .from(events)
    .where(inArray(events.status, ["show", "closed"]))
    .orderBy(desc(events.startsAt));

  if (eventRows.length === 0) {
    return { upcoming: [], past: [] };
  }

  const eventIds = eventRows.map((event) => event.id);
  const [countRows, memberRows] = await Promise.all([
    getRsvpCountRows(eventIds),
    db
      .select({
        eventId: rsvps.eventId,
        telegramDisplayName: members.telegramDisplayName,
        telegramPhotoUrl: members.telegramPhotoUrl,
      })
      .from(rsvps)
      .innerJoin(members, eq(rsvps.memberId, members.id))
      .where(
        and(
          inArray(rsvps.eventId, eventIds),
          inArray(rsvps.status, ["confirmed"]),
        ),
      ),
  ]);
  const countsByEvent = toCountMap(countRows);

  const membersByEvent = new Map<string, PublicEvent["rsvpMembers"]>();
  for (const row of memberRows) {
    const list = membersByEvent.get(row.eventId) ?? [];
    list.push({
      telegramDisplayName: row.telegramDisplayName,
      telegramPhotoUrl: row.telegramPhotoUrl,
    });
    membersByEvent.set(row.eventId, list);
  }

  const now = new Date();
  const upcoming: PublicEvent[] = [];
  const past: PublicEvent[] = [];

  for (const event of eventRows) {
    const entry: PublicEvent = {
      event,
      confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
      waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
      rsvpMembers: membersByEvent.get(event.id) ?? [],
    };

    if (event.endsAt ? event.endsAt < now : event.startsAt < now) {
      past.push(entry);
    } else {
      upcoming.push(entry);
    }
  }

  return { upcoming, past };
}

async function getRsvpCountRows(eventIds: string[]) {
  if (eventIds.length === 0) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      eventId: rsvps.eventId,
      status: rsvps.status,
      total: count(),
    })
    .from(rsvps)
    .where(
      and(
        inArray(rsvps.eventId, eventIds),
        inArray(rsvps.status, [...capacityBearingStatuses, "waitlisted"]),
      ),
    )
    .groupBy(rsvps.eventId, rsvps.status);
}

function toCountMap(
  rows: Array<{ eventId: string; status: string; total: number }>,
) {
  const countsByEvent = new Map<
    string,
    { confirmed: number; waitlisted: number }
  >();

  for (const row of rows) {
    const current = countsByEvent.get(row.eventId) ?? {
      confirmed: 0,
      waitlisted: 0,
    };

    if (isCapacityBearingStatus(row.status)) {
      current.confirmed += Number(row.total);
    }

    if (row.status === "waitlisted") {
      current.waitlisted = Number(row.total);
    }

    countsByEvent.set(row.eventId, current);
  }

  return countsByEvent;
}

function isCapacityBearingStatus(status: string): boolean {
  return capacityBearingStatuses.includes(
    status as (typeof capacityBearingStatuses)[number],
  );
}

export interface RsvpPageData {
  event: Event;
  confirmedCount: number;
  waitlistedCount: number;
  rsvp?: Rsvp;
  plusOne?: Rsvp;
  survey?: {
    id: string;
    title: string;
    schema: SurveySchema;
  };
}

export async function getRsvpPageData(
  memberId: string,
  slug: string,
): Promise<RsvpPageData | null> {
  const db = getDb();

  const eventRows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.slug, slug),
        inArray(events.status, ["show", "closed"]),
      ),
    )
    .limit(1);
  const event = eventRows[0];

  if (!event) return null;

  const [memberRsvpRows, countRows, surveyRows] = await Promise.all([
    db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.memberId, memberId), eq(rsvps.eventId, event.id))),
    getRsvpCountRows([event.id]),
    db
      .select()
      .from(surveys)
      .where(
        and(
          eq(surveys.eventId, event.id),
          eq(surveys.status, "published"),
        ),
      )
      .limit(1),
  ]);

  const countsByEvent = toCountMap(countRows);
  const parentRsvp = memberRsvpRows.find((r) => !r.parentRsvpId);
  const plusOne = memberRsvpRows.find((r) => r.parentRsvpId);
  const survey = surveyRows[0];

  return {
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvp: parentRsvp,
    plusOne,
    survey: survey
      ? { id: survey.id, title: survey.title, schema: parseSurveySchema(survey.schemaJson) }
      : undefined,
  };
}

export interface AdminEventDetail {
  event: Event;
  confirmedCount: number;
  waitlistedCount: number;
  rsvps: Array<{
    rsvp: Rsvp;
    member: Pick<Member, "id" | "telegramDisplayName" | "telegramUsername" | "telegramPhotoUrl" | "groupStatus">;
    plusOne: Array<Pick<Rsvp, "id" | "status" | "plusOneName" | "paymentStatus" | "checkedInAt" | "notes" | "tags">>;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amountCents: number;
    category: string;
  }>;
  survey?: {
    id: string;
    title: string;
    schema: SurveySchema;
    responses: Array<{
      memberId: string;
      answersJson: unknown;
    }>;
  };
}

export async function getAdminEventDetail(eventId: string): Promise<AdminEventDetail | null> {
  const db = getDb();

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const event = eventRows[0];
  if (!event) return null;

  const [countRows, rsvpRows, surveyRows, expenseRows] = await Promise.all([
    getRsvpCountRows([event.id]),
    db
      .select({
        rsvp: rsvps,
        member: {
          id: members.id,
          telegramDisplayName: members.telegramDisplayName,
          telegramUsername: members.telegramUsername,
          telegramPhotoUrl: members.telegramPhotoUrl,
          groupStatus: members.groupStatus,
        },
      })
      .from(rsvps)
      .innerJoin(members, eq(rsvps.memberId, members.id))
      .where(eq(rsvps.eventId, event.id))
      .orderBy(desc(rsvps.createdAt)),
    db
      .select()
      .from(surveys)
      .where(eq(surveys.eventId, event.id))
      .limit(1),
    db
      .select()
      .from(eventExpenses)
      .where(eq(eventExpenses.eventId, event.id))
      .orderBy(desc(eventExpenses.createdAt)),
  ]);

  const countsByEvent = toCountMap(countRows);

  const parents = rsvpRows.filter((r) => !r.rsvp.parentRsvpId);
  const plusOnes = rsvpRows.filter((r) => r.rsvp.parentRsvpId);

  const rsvpsWithPlusOnes = parents.map((p) => ({
    rsvp: p.rsvp,
    member: p.member,
    plusOne: plusOnes
      .filter((po) => po.rsvp.parentRsvpId === p.rsvp.id)
      .map((po) => ({
        id: po.rsvp.id,
        status: po.rsvp.status,
        plusOneName: po.rsvp.plusOneName,
        paymentStatus: po.rsvp.paymentStatus,
        checkedInAt: po.rsvp.checkedInAt,
        notes: po.rsvp.notes,
        tags: po.rsvp.tags,
      })),
  }));

  const survey = surveyRows[0];
  let surveyDetail: AdminEventDetail["survey"];

  if (survey) {
    const responseRows = await db
      .select({
        memberId: surveyResponses.memberId,
        answersJson: surveyResponses.answersJson,
      })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, survey.id));

    surveyDetail = {
      id: survey.id,
      title: survey.title,
      schema: parseSurveySchema(survey.schemaJson),
      responses: responseRows,
    };
  }

  return {
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvps: rsvpsWithPlusOnes,
    expenses: expenseRows.map((e) => ({
      id: e.id,
      description: e.description,
      amountCents: e.amountCents,
      category: e.category,
    })),
    survey: surveyDetail,
  };
}
