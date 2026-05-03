import {
  and,
  count,
  desc,
  events,
  eq,
  getDb,
  inArray,
  members,
  rsvps,
  type Event,
  type Member,
  type Rsvp,
} from "@cego/db";

export interface EventWithRsvpState {
  event: Event;
  confirmedCount: number;
  waitlistedCount: number;
  rsvp?: Rsvp;
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

const capacityBearingStatuses = ["confirmed"] as const;

export async function getDashboardEvents(
  memberId: string,
): Promise<EventWithRsvpState[]> {
  const db = getDb();
  const eventRows = await db
    .select()
    .from(events)
    .where(inArray(events.status, ["open", "full", "closed"]))
    .orderBy(desc(events.startsAt));

  if (eventRows.length === 0) {
    return [];
  }

  const eventIds = eventRows.map((event) => event.id);
  const [memberRsvpRows, countRows] = await Promise.all([
    db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.memberId, memberId), inArray(rsvps.eventId, eventIds))),
    getRsvpCountRows(eventIds),
  ]);

  const memberRsvpsByEvent = new Map(
    memberRsvpRows.map((rsvp) => [rsvp.eventId, rsvp]),
  );
  const countsByEvent = toCountMap(countRows);

  return eventRows.map((event) => ({
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvp: memberRsvpsByEvent.get(event.id),
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
        inArray(events.status, ["open", "full", "closed"]),
      ),
    )
    .limit(1);
  const event = eventRows[0];

  if (!event) {
    return null;
  }

  const [memberRsvpRows, countRows] = await Promise.all([
    db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.memberId, memberId), eq(rsvps.eventId, event.id)))
      .limit(1),
    getRsvpCountRows([event.id]),
  ]);
  const countsByEvent = toCountMap(countRows);

  return {
    event,
    confirmedCount: countsByEvent.get(event.id)?.confirmed ?? 0,
    waitlistedCount: countsByEvent.get(event.id)?.waitlisted ?? 0,
    rsvp: memberRsvpRows[0],
  };
}

export async function getAdminEvents(): Promise<AdminEventWithRsvps[]> {
  const db = getDb();
  const eventRows = await db.select().from(events).orderBy(desc(events.startsAt));

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
