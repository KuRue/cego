import {
  and,
  asc,
  count,
  desc,
  eq,
  events,
  getDb,
  ilike,
  inArray,
  memberGroupStatuses,
  memberNotes,
  members,
  memberTagAssignments,
  memberTags,
  or,
  rsvps,
  surveyResponses,
  surveys,
  type Event,
  type Member,
  type MemberGroupStatus,
  type MemberNote,
  type MemberTag,
  type Rsvp,
  type Survey,
  type SurveyResponse,
} from "@arf/db";

export interface AdminMemberDirectoryFilters {
  q?: string;
  groupStatus?: MemberGroupStatus | "all";
  eventId?: string;
  surveyId?: string;
  tagId?: string;
}

export interface AdminMemberSummary {
  member: Member;
  rsvpCount: number;
  surveyResponseCount: number;
  noteCount: number;
  tags: MemberTag[];
}

export interface AdminMemberDirectory {
  members: AdminMemberSummary[];
  filters: {
    events: Array<Pick<Event, "id" | "title" | "startsAt">>;
    surveys: Array<Pick<Survey, "id" | "title" | "eventId">>;
    tags: MemberTag[];
  };
  totals: {
    members: number;
    groupMembers: number;
    nonMembers: number;
    unknown: number;
  };
}

export interface AdminMemberDetail {
  member: Member;
  tags: MemberTag[];
  availableTags: MemberTag[];
  notes: Array<{
    note: MemberNote;
    author?: Pick<Member, "id" | "telegramDisplayName" | "telegramUsername">;
  }>;
  rsvps: Array<{
    rsvp: Rsvp;
    event: Pick<Event, "id" | "title" | "startsAt" | "type" | "status">;
  }>;
  surveyResponses: Array<{
    response: SurveyResponse;
    survey: Pick<Survey, "id" | "title" | "eventId" | "schemaJson">;
    event?: Pick<Event, "id" | "title" | "startsAt">;
  }>;
}

export function normalizeDirectoryFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminMemberDirectoryFilters {
  return {
    q: firstParam(searchParams.q),
    groupStatus: normalizeGroupStatus(firstParam(searchParams.groupStatus)),
    eventId: firstParam(searchParams.eventId),
    surveyId: firstParam(searchParams.surveyId),
    tagId: firstParam(searchParams.tagId),
  };
}

export async function getAdminMemberDirectory(
  filters: AdminMemberDirectoryFilters,
): Promise<AdminMemberDirectory> {
  const db = getDb();
  const q = filters.q?.trim();
  const whereConditions = [];

  if (filters.groupStatus && filters.groupStatus !== "all") {
    whereConditions.push(eq(members.groupStatus, filters.groupStatus));
  }

  if (q) {
    const pattern = `%${q}%`;
    whereConditions.push(
      or(
        ilike(members.telegramDisplayName, pattern),
        ilike(members.telegramUsername, pattern),
        ilike(members.telegramId, pattern),
        ilike(members.email, pattern),
      ),
    );
  }

  const [
    allMemberRows,
    eventRows,
    surveyRows,
    tagRows,
    eventFilterRows,
    surveyFilterRows,
    tagFilterRows,
  ] = await Promise.all([
    whereConditions.length > 0
      ? db
          .select()
          .from(members)
          .where(and(...whereConditions))
          .orderBy(asc(members.telegramDisplayName))
      : db.select().from(members).orderBy(asc(members.telegramDisplayName)),
    db
      .select({
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
      })
      .from(events)
      .orderBy(desc(events.startsAt)),
    db
      .select({
        id: surveys.id,
        title: surveys.title,
        eventId: surveys.eventId,
      })
      .from(surveys)
      .orderBy(asc(surveys.title)),
    db.select().from(memberTags).orderBy(asc(memberTags.name)),
    filters.eventId
      ? db
          .select({ memberId: rsvps.memberId })
          .from(rsvps)
          .where(eq(rsvps.eventId, filters.eventId))
      : [],
    filters.surveyId
      ? db
          .select({ memberId: surveyResponses.memberId })
          .from(surveyResponses)
          .where(eq(surveyResponses.surveyId, filters.surveyId))
      : [],
    filters.tagId
      ? db
          .select({ memberId: memberTagAssignments.memberId })
          .from(memberTagAssignments)
          .where(eq(memberTagAssignments.tagId, filters.tagId))
      : [],
  ]);

  const eventMemberIds = filters.eventId
    ? new Set(eventFilterRows.map(({ memberId }) => memberId))
    : null;
  const surveyMemberIds = filters.surveyId
    ? new Set(surveyFilterRows.map(({ memberId }) => memberId))
    : null;
  const tagMemberIds = filters.tagId
    ? new Set(tagFilterRows.map(({ memberId }) => memberId))
    : null;

  const visibleMembers = allMemberRows.filter((member) => {
    if (eventMemberIds && !eventMemberIds.has(member.id)) {
      return false;
    }

    if (surveyMemberIds && !surveyMemberIds.has(member.id)) {
      return false;
    }

    if (tagMemberIds && !tagMemberIds.has(member.id)) {
      return false;
    }

    return true;
  });

  const summaries = await summarizeMembers(visibleMembers);
  const totals = summarizeMemberTotals(visibleMembers);

  return {
    members: summaries,
    filters: {
      events: eventRows,
      surveys: surveyRows,
      tags: tagRows,
    },
    totals,
  };
}

export async function getAdminMemberDetail(
  memberId: string,
): Promise<AdminMemberDetail | null> {
  const db = getDb();
  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const member = memberRows[0];

  if (!member) {
    return null;
  }

  const [
    tagRows,
    availableTags,
    noteRows,
    rsvpRows,
    responseRows,
  ] = await Promise.all([
    db
      .select({ tag: memberTags })
      .from(memberTagAssignments)
      .innerJoin(memberTags, eq(memberTagAssignments.tagId, memberTags.id))
      .where(eq(memberTagAssignments.memberId, memberId))
      .orderBy(asc(memberTags.name)),
    db.select().from(memberTags).orderBy(asc(memberTags.name)),
    db
      .select({
        note: memberNotes,
        author: {
          id: members.id,
          telegramDisplayName: members.telegramDisplayName,
          telegramUsername: members.telegramUsername,
        },
      })
      .from(memberNotes)
      .leftJoin(members, eq(memberNotes.authorMemberId, members.id))
      .where(eq(memberNotes.memberId, memberId))
      .orderBy(desc(memberNotes.createdAt)),
    db
      .select({
        rsvp: rsvps,
        event: {
          id: events.id,
          title: events.title,
          startsAt: events.startsAt,
          type: events.type,
          status: events.status,
        },
      })
      .from(rsvps)
      .innerJoin(events, eq(rsvps.eventId, events.id))
      .where(eq(rsvps.memberId, memberId))
      .orderBy(desc(events.startsAt)),
    db
      .select({
        response: surveyResponses,
        survey: {
          id: surveys.id,
          title: surveys.title,
          eventId: surveys.eventId,
          schemaJson: surveys.schemaJson,
        },
        event: {
          id: events.id,
          title: events.title,
          startsAt: events.startsAt,
        },
      })
      .from(surveyResponses)
      .innerJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
      .leftJoin(events, eq(surveyResponses.eventId, events.id))
      .where(eq(surveyResponses.memberId, memberId))
      .orderBy(desc(surveyResponses.updatedAt)),
  ]);

  return {
    member,
    tags: tagRows.map(({ tag }) => tag),
    availableTags,
    notes: noteRows.map(({ note, author }) => ({
      note,
      author: author?.id ? author : undefined,
    })),
    rsvps: rsvpRows,
    surveyResponses: responseRows.map(({ response, survey, event }) => ({
      response,
      survey,
      event: event?.id ? event : undefined,
    })),
  };
}

async function summarizeMembers(
  memberRows: Member[],
): Promise<AdminMemberSummary[]> {
  if (memberRows.length === 0) {
    return [];
  }

  const db = getDb();
  const memberIds = memberRows.map((member) => member.id);
  const [rsvpCountRows, surveyCountRows, noteCountRows, tagRows] =
    await Promise.all([
      db
        .select({
          memberId: rsvps.memberId,
          total: count(),
        })
        .from(rsvps)
        .where(inArray(rsvps.memberId, memberIds))
        .groupBy(rsvps.memberId),
      db
        .select({
          memberId: surveyResponses.memberId,
          total: count(),
        })
        .from(surveyResponses)
        .where(inArray(surveyResponses.memberId, memberIds))
        .groupBy(surveyResponses.memberId),
      db
        .select({
          memberId: memberNotes.memberId,
          total: count(),
        })
        .from(memberNotes)
        .where(inArray(memberNotes.memberId, memberIds))
        .groupBy(memberNotes.memberId),
      db
        .select({
          memberId: memberTagAssignments.memberId,
          tag: memberTags,
        })
        .from(memberTagAssignments)
        .innerJoin(memberTags, eq(memberTagAssignments.tagId, memberTags.id))
        .where(inArray(memberTagAssignments.memberId, memberIds))
        .orderBy(asc(memberTags.name)),
    ]);

  const rsvpCounts = toCountMap(rsvpCountRows);
  const surveyCounts = toCountMap(surveyCountRows);
  const noteCounts = toCountMap(noteCountRows);
  const tagsByMember = new Map<string, MemberTag[]>();

  for (const row of tagRows) {
    const current = tagsByMember.get(row.memberId) ?? [];
    current.push(row.tag);
    tagsByMember.set(row.memberId, current);
  }

  return memberRows.map((member) => ({
    member,
    rsvpCount: rsvpCounts.get(member.id) ?? 0,
    surveyResponseCount: surveyCounts.get(member.id) ?? 0,
    noteCount: noteCounts.get(member.id) ?? 0,
    tags: tagsByMember.get(member.id) ?? [],
  }));
}

function summarizeMemberTotals(memberRows: Member[]) {
  return {
    members: memberRows.length,
    groupMembers: memberRows.filter(
      ({ groupStatus }) => groupStatus === "member",
    ).length,
    nonMembers: memberRows.filter(
      ({ groupStatus }) => groupStatus === "not_member",
    ).length,
    unknown: memberRows.filter(({ groupStatus }) => groupStatus === "unknown")
      .length,
  };
}

function toCountMap(rows: Array<{ memberId: string; total: number }>) {
  return new Map(rows.map((row) => [row.memberId, Number(row.total)]));
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeGroupStatus(
  value: string | undefined,
): MemberGroupStatus | "all" | undefined {
  if (!value || value === "all") {
    return "all";
  }

  return memberGroupStatuses.includes(value as MemberGroupStatus)
    ? (value as MemberGroupStatus)
    : "all";
}
