import { createHmac, timingSafeEqual } from "node:crypto";
import {
  and,
  eq,
  events,
  getDb,
  hiEventsWebhookLogs,
  members,
  rsvps,
  type Event,
  type Member,
  type Rsvp,
} from "@arf/db";

type JsonRecord = Record<string, unknown>;

interface HiEventsWebhookEnvelope {
  event_type?: unknown;
  event_sent_at?: unknown;
  payload?: unknown;
}

interface HiEventsWebhookDetails {
  eventType: string;
  hiEventsEventId?: string;
  hiEventsOrderId?: string;
  hiEventsAttendeeId?: string;
  rsvpId?: string;
  memberId?: string;
  telegramId?: string;
  email?: string;
  ticketType?: string;
  checkedInAt?: Date;
  orderStatus?: string;
  paymentStatus?: string;
  attendeeStatus?: string;
}

interface MatchedRsvp {
  rsvp: Rsvp;
  event: Event;
  member: Member;
}

export interface HiEventsWebhookResult {
  status: "processed" | "ignored" | "failed";
  message: string;
  eventType: string;
  rsvpId?: string;
}

const paidPaymentStatuses = new Set(["PAYMENT_RECEIVED", "NO_PAYMENT_REQUIRED"]);

export function buildHiEventsCheckoutUrl({
  event,
  member,
  rsvp,
}: {
  event: Pick<Event, "id" | "slug" | "hiEventsEventId">;
  member: Pick<Member, "id" | "telegramId" | "email">;
  rsvp: Pick<Rsvp, "id">;
}): string {
  if (!event.hiEventsEventId) {
    throw new Error("A Hi.Events event ID is required before payment approval.");
  }

  if (!member.email) {
    throw new Error("A member email is required before payment approval.");
  }

  const baseUrl = trimTrailingSlash(
    process.env.HI_EVENTS_BASE_URL ?? "https://events.arf.kurue.com",
  );
  const template =
    process.env.HI_EVENTS_CHECKOUT_URL_TEMPLATE ??
    `${baseUrl}/checkout/{eventId}?email={email}`;
  const replacements: Record<string, string> = {
    eventId: event.hiEventsEventId,
    eventSlug: event.slug,
    arfEventId: event.id,
    rsvpId: rsvp.id,
    memberId: member.id,
    telegramId: member.telegramId,
    email: member.email,
  };

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) =>
    encodeURIComponent(replacements[key] ?? ""),
  );
}

export function verifyHiEventsWebhookSignature({
  rawBody,
  secret,
  signature,
}: {
  rawBody: string;
  secret: string;
  signature: string | null;
}): boolean {
  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(signature.trim(), expected);
}

export function parseHiEventsWebhookEnvelope(
  rawBody: string,
): HiEventsWebhookEnvelope {
  const parsed = JSON.parse(rawBody) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Hi.Events webhook body must be a JSON object.");
  }

  return parsed;
}

export async function handleHiEventsWebhook(
  envelope: HiEventsWebhookEnvelope,
): Promise<HiEventsWebhookResult> {
  const details = extractWebhookDetails(envelope);
  const targetStatus = getTargetRsvpStatus(details);

  if (!targetStatus) {
    await logWebhook({
      details,
      payloadJson: envelope,
      status: "ignored",
      errorMessage: "Webhook event does not change ARF RSVP payment state.",
    });

    return {
      status: "ignored",
      message: "Webhook event ignored.",
      eventType: details.eventType,
    };
  }

  const match = await findMatchingRsvp(details);

  if (!match) {
    await logWebhook({
      details,
      payloadJson: envelope,
      status: "failed",
      errorMessage: "No unique matching ARF RSVP was found.",
    });

    return {
      status: "failed",
      message: "No unique matching ARF RSVP was found.",
      eventType: details.eventType,
    };
  }

  const db = getDb();
  await db
    .update(rsvps)
    .set({
      status: targetStatus,
      hiEventsOrderId:
        details.hiEventsOrderId ?? match.rsvp.hiEventsOrderId ?? null,
      hiEventsAttendeeId:
        details.hiEventsAttendeeId ?? match.rsvp.hiEventsAttendeeId ?? null,
      ticketType: details.ticketType ?? match.rsvp.ticketType ?? null,
      checkedInAt: details.checkedInAt ?? match.rsvp.checkedInAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(rsvps.id, match.rsvp.id));

  await logWebhook({
    details,
    payloadJson: envelope,
    status: "processed",
    eventId: match.event.id,
    rsvpId: match.rsvp.id,
  });

  return {
    status: "processed",
    message: `RSVP updated to ${targetStatus}.`,
    eventType: details.eventType,
    rsvpId: match.rsvp.id,
  };
}

function extractWebhookDetails(
  envelope: HiEventsWebhookEnvelope,
): HiEventsWebhookDetails {
  const payload = asRecord(envelope.payload) ?? {};
  const order = payload.event_id ? payload : asRecord(payload.order) ?? {};
  const attendees = readArray(order.attendees ?? payload.attendees);
  const attendee =
    normalizeEventType(envelope.event_type).startsWith("attendee.") ||
    normalizeEventType(envelope.event_type).startsWith("checkin.")
      ? payload
      : (firstRecord(attendees) ?? {});
  const orderFromAttendee = asRecord(attendee.order) ?? {};
  const product = asRecord(attendee.product) ?? {};
  const firstOrderItem = firstRecord(readArray(order.order_items));
  const arfContext = extractArfContext(payload);

  return {
    eventType: normalizeEventType(envelope.event_type),
    hiEventsEventId: readFirstText(
      payload.event_id,
      attendee.event_id,
      order.event_id,
      orderFromAttendee.event_id,
    ),
    hiEventsOrderId: readFirstText(
      payload.order_id,
      attendee.order_id,
      order.id,
      order.public_id,
      orderFromAttendee.id,
    ),
    hiEventsAttendeeId: readFirstText(attendee.id, payload.attendee_id),
    rsvpId: arfContext.rsvpId,
    memberId: arfContext.memberId,
    telegramId: arfContext.telegramId,
    email: normalizeEmail(
      readFirstText(attendee.email, payload.email, order.email, orderFromAttendee.email),
    ),
    ticketType: readFirstText(
      firstOrderItem?.item_name,
      product.title,
      product.name,
      product.public_title,
    ),
    checkedInAt: readDate(payload.checked_in_at, attendee.checked_in_at),
    orderStatus: normalizeStatus(readFirstText(order.status, orderFromAttendee.status)),
    paymentStatus: normalizeStatus(
      readFirstText(order.payment_status, orderFromAttendee.payment_status),
    ),
    attendeeStatus: normalizeStatus(readFirstText(attendee.status, payload.status)),
  };
}

function getTargetRsvpStatus(
  details: HiEventsWebhookDetails,
): "paid_registered" | "cancelled" | null {
  if (
    details.eventType === "order.cancelled" ||
    details.eventType === "attendee.cancelled"
  ) {
    return "cancelled";
  }

  if (details.eventType === "order.marked_as_paid") {
    return "paid_registered";
  }

  if (details.paymentStatus && paidPaymentStatuses.has(details.paymentStatus)) {
    return "paid_registered";
  }

  if (
    details.orderStatus === "COMPLETED" &&
    details.paymentStatus !== "AWAITING_PAYMENT" &&
    details.paymentStatus !== "PAYMENT_FAILED"
  ) {
    return "paid_registered";
  }

  if (
    details.eventType.startsWith("attendee.") &&
    details.attendeeStatus === "ACTIVE" &&
    details.paymentStatus !== "AWAITING_PAYMENT" &&
    details.paymentStatus !== "PAYMENT_FAILED"
  ) {
    return "paid_registered";
  }

  return null;
}

async function findMatchingRsvp(
  details: HiEventsWebhookDetails,
): Promise<MatchedRsvp | null> {
  if (details.rsvpId) {
    return getRsvpById(details.rsvpId);
  }

  if (details.hiEventsOrderId) {
    const byOrderId = await getRsvpByHiEventsField(
      "order",
      details.hiEventsOrderId,
    );

    if (byOrderId) {
      return byOrderId;
    }
  }

  if (details.hiEventsAttendeeId) {
    const byAttendeeId = await getRsvpByHiEventsField(
      "attendee",
      details.hiEventsAttendeeId,
    );

    if (byAttendeeId) {
      return byAttendeeId;
    }
  }

  if (details.hiEventsEventId && details.memberId) {
    const byMemberId = await getRsvpByEventAndMemberId(
      details.hiEventsEventId,
      details.memberId,
    );

    if (byMemberId) {
      return byMemberId;
    }
  }

  if (details.hiEventsEventId && details.telegramId) {
    const byTelegramId = await getRsvpByEventAndTelegramId(
      details.hiEventsEventId,
      details.telegramId,
    );

    if (byTelegramId) {
      return byTelegramId;
    }
  }

  if (details.hiEventsEventId && details.email) {
    return getRsvpByEventAndEmail(details.hiEventsEventId, details.email);
  }

  return null;
}

async function getRsvpById(rsvpId: string): Promise<MatchedRsvp | null> {
  const db = getDb();
  const rows = await db
    .select({ rsvp: rsvps, event: events, member: members })
    .from(rsvps)
    .innerJoin(events, eq(rsvps.eventId, events.id))
    .innerJoin(members, eq(rsvps.memberId, members.id))
    .where(eq(rsvps.id, rsvpId))
    .limit(1);

  return rows[0] ?? null;
}

async function getRsvpByHiEventsField(
  field: "order" | "attendee",
  value: string,
): Promise<MatchedRsvp | null> {
  const db = getDb();
  const rows = await db
    .select({ rsvp: rsvps, event: events, member: members })
    .from(rsvps)
    .innerJoin(events, eq(rsvps.eventId, events.id))
    .innerJoin(members, eq(rsvps.memberId, members.id))
    .where(
      field === "order"
        ? eq(rsvps.hiEventsOrderId, value)
        : eq(rsvps.hiEventsAttendeeId, value),
    )
    .limit(2);

  return rows.length === 1 ? rows[0] : null;
}

async function getRsvpByEventAndMemberId(
  hiEventsEventId: string,
  memberId: string,
): Promise<MatchedRsvp | null> {
  const db = getDb();
  const rows = await db
    .select({ rsvp: rsvps, event: events, member: members })
    .from(rsvps)
    .innerJoin(events, eq(rsvps.eventId, events.id))
    .innerJoin(members, eq(rsvps.memberId, members.id))
    .where(and(eq(events.hiEventsEventId, hiEventsEventId), eq(members.id, memberId)))
    .limit(2);

  return rows.length === 1 ? rows[0] : null;
}

async function getRsvpByEventAndTelegramId(
  hiEventsEventId: string,
  telegramId: string,
): Promise<MatchedRsvp | null> {
  const db = getDb();
  const rows = await db
    .select({ rsvp: rsvps, event: events, member: members })
    .from(rsvps)
    .innerJoin(events, eq(rsvps.eventId, events.id))
    .innerJoin(members, eq(rsvps.memberId, members.id))
    .where(
      and(
        eq(events.hiEventsEventId, hiEventsEventId),
        eq(members.telegramId, telegramId),
      ),
    )
    .limit(2);

  return rows.length === 1 ? rows[0] : null;
}

async function getRsvpByEventAndEmail(
  hiEventsEventId: string,
  email: string,
): Promise<MatchedRsvp | null> {
  const db = getDb();
  const rows = await db
    .select({ rsvp: rsvps, event: events, member: members })
    .from(rsvps)
    .innerJoin(events, eq(rsvps.eventId, events.id))
    .innerJoin(members, eq(rsvps.memberId, members.id))
    .where(eq(events.hiEventsEventId, hiEventsEventId));
  const matches = rows.filter(
    ({ member }) => normalizeEmail(member.email) === email,
  );

  if (matches.length === 1) {
    return matches[0];
  }

  const approvedMatches = matches.filter(
    ({ rsvp }) =>
      rsvp.status === "approved_to_pay" || rsvp.status === "paid_registered",
  );

  return approvedMatches.length === 1 ? approvedMatches[0] : null;
}

async function logWebhook({
  details,
  errorMessage,
  eventId,
  payloadJson,
  rsvpId,
  status,
}: {
  details: HiEventsWebhookDetails;
  errorMessage?: string;
  eventId?: string;
  payloadJson: unknown;
  rsvpId?: string;
  status: "processed" | "ignored" | "failed";
}) {
  const db = getDb();
  await db.insert(hiEventsWebhookLogs).values({
    eventId,
    rsvpId,
    hiEventsEventId: details.hiEventsEventId,
    hiEventsOrderId: details.hiEventsOrderId,
    hiEventsAttendeeId: details.hiEventsAttendeeId,
    eventType: details.eventType,
    status,
    payloadJson,
    errorMessage,
  });
}

function extractArfContext(root: JsonRecord) {
  const values = collectArfValues(root);

  return {
    rsvpId: values.arf_rsvp_id ?? values.arfRsvpId,
    memberId: values.arf_member_id ?? values.arfMemberId,
    telegramId: values.arf_telegram_id ?? values.arfTelegramId,
  };
}

function collectArfValues(value: unknown): Record<string, string> {
  const found: Record<string, string> = {};
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (!isRecord(node)) {
      return;
    }

    const title = readFirstText(node.title, node.question, node.label);
    const answer = readFirstText(node.text_answer, node.answer, node.value);

    if (title && answer) {
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "_");

      if (normalizedTitle.includes("arf_rsvp")) {
        found.arf_rsvp_id = answer;
      }

      if (normalizedTitle.includes("arf_member")) {
        found.arf_member_id = answer;
      }

      if (normalizedTitle.includes("telegram_id")) {
        found.arf_telegram_id = answer;
      }
    }

    for (const [key, child] of Object.entries(node)) {
      if (
        [
          "arf_rsvp_id",
          "arfRsvpId",
          "arf_member_id",
          "arfMemberId",
          "arf_telegram_id",
          "arfTelegramId",
        ].includes(key)
      ) {
        const text = readFirstText(child);

        if (text) {
          found[key] = text;
        }
      }

      visit(child);
    }
  };

  visit(value);
  return found;
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);

  if (Array.isArray(record?.data)) {
    return record.data;
  }

  return [];
}

function firstRecord(value: unknown[]): JsonRecord | undefined {
  return value.map(asRecord).find(Boolean);
}

function readFirstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function readDate(...values: unknown[]): Date | undefined {
  const text = readFirstText(...values);

  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEventType(value: unknown): string {
  return readFirstText(value)?.toLowerCase() ?? "unknown";
}

function normalizeStatus(value?: string): string | undefined {
  return value?.trim().toUpperCase();
}

function normalizeEmail(value?: string | null): string | undefined {
  return value?.trim().toLowerCase() || undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function safeCompare(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
