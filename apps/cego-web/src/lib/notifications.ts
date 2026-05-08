import {
  events,
  getDb,
  members,
  notifications,
  rsvps,
} from "@cego/db";
import { and, asc, eq, inArray, sql } from "@cego/db";
import { sendTelegramMessage, telegramHtmlBold } from "@cego/telegram";
import { formatDateWithTime } from "@/lib/format-date";
import { getSiteSettings } from "@/lib/settings";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

const notificationTemplates = [
  "rsvp_confirmed",
  "rsvp_confirmed_plusone_waitlisted",
  "rsvp_waitlisted",
  "rsvp_promoted",
  "rsvp_cancelled",
  "rsvp_expired",
  "payment_confirmed",
  "payment_waived",
  "payment_reminder",
  "new_event",
  "checked_in",
] as const;

type NotificationTemplate = typeof notificationTemplates[number];

const rsvpNotificationTemplates = [
  "rsvp_confirmed",
  "rsvp_confirmed_plusone_waitlisted",
  "rsvp_waitlisted",
  "rsvp_promoted",
  "rsvp_cancelled",
  "rsvp_expired",
  "payment_confirmed",
  "payment_waived",
  "payment_reminder",
  "checked_in",
] satisfies NotificationTemplate[];

type NotificationDeliveryPayload = {
  chatId: string;
  text: string;
};

type NotificationDeliveryStatus = "sent" | "failed";

function buildMessage(
  template: NotificationTemplate,
  event: { title: string; paymentDueDate: Date | null; priceCents: number | null; currency: string },
  tz: string,
): string {
  switch (template) {
    case "rsvp_confirmed": {
      let msg = `✅ You're confirmed for ${telegramHtmlBold(event.title)}!`;
      if (event.paymentDueDate) {
        const due = formatDateWithTime(event.paymentDueDate, tz);
        msg += `\n\n💳 Payment is due by ${due}.`;
      }
      return msg;
    }
    case "rsvp_confirmed_plusone_waitlisted": {
      let msg = `✅ You're confirmed for ${telegramHtmlBold(event.title)}, but your +1 is on the waitlist.`;
      if (event.paymentDueDate) {
        const due = formatDateWithTime(event.paymentDueDate, tz);
        msg += `\n\n💳 Payment is due by ${due}.`;
      }
      return msg;
    }
    case "rsvp_waitlisted":
      return `⏳ You've been waitlisted for ${telegramHtmlBold(event.title)}. You'll be notified if a spot opens up.`;
    case "rsvp_promoted":
      return `🎉 A spot opened up - you're now <strong>confirmed</strong> for ${telegramHtmlBold(event.title)}!${event.paymentDueDate ? `\n\n💳 Payment is due by ${formatDateWithTime(event.paymentDueDate, tz)}.` : ""}`;
    case "rsvp_cancelled":
      return `❌ Your RSVP for ${telegramHtmlBold(event.title)} has been cancelled.`;
    case "rsvp_expired":
      return `⏰ Your RSVP for ${telegramHtmlBold(event.title)} has expired because payment was not received in time.`;
    case "payment_confirmed":
      return `✅ Payment confirmed for ${telegramHtmlBold(event.title)}. You're all set!`;
    case "payment_waived":
      return `✅ Payment has been waived for ${telegramHtmlBold(event.title)}. You're all set!`;
    case "payment_reminder": {
      const due = event.paymentDueDate ? formatDateWithTime(event.paymentDueDate, tz) : "soon";
      return `⏰ Reminder: Payment for ${telegramHtmlBold(event.title)} is due by ${due}.`;
    }
    case "new_event":
      return `🎉 New event: ${telegramHtmlBold(event.title)}. Check it out and RSVP!`;
    case "checked_in":
      return `✅ You've been checked in for ${telegramHtmlBold(event.title)}. Welcome!`;
  }
}

export async function sendNotification({
  memberId,
  eventId,
  template,
}: {
  memberId: string;
  eventId: string;
  template: NotificationTemplate;
}): Promise<void> {
  if (!BOT_TOKEN) return;

  const db = getDb();

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.memberId, memberId),
        eq(notifications.eventId, eventId),
        eq(notifications.templateKey, template),
        inArray(notifications.status, ["queued"]),
      ),
    )
    .limit(1);

  if (existing) return;

  const payload = await buildNotificationPayload(db, { memberId, eventId, template });
  if (!payload) return;

  const [row] = await db
    .insert(notifications)
    .values({
      memberId,
      eventId,
      telegramChatId: payload.chatId,
      templateKey: template,
      status: "queued",
    })
    .returning({ id: notifications.id });

  if (!row) return;

  await deliverNotification(db, row.id, payload);
}

export async function retryFailedNotifications(limit = 25): Promise<{
  retriedNotificationCount: number;
  sentNotificationCount: number;
  failedNotificationCount: number;
}> {
  if (!BOT_TOKEN) {
    return {
      retriedNotificationCount: 0,
      sentNotificationCount: 0,
      failedNotificationCount: 0,
    };
  }

  const db = getDb();

  await db
    .update(notifications)
    .set({ status: "failed", errorMessage: "Delivery interrupted (stale queued row)" })
    .where(
      and(
        eq(notifications.status, "queued"),
        sql`${notifications.createdAt} < now() - interval '5 minutes'`,
      ),
    );

  const candidates = await db
    .select({
      id: notifications.id,
      memberId: notifications.memberId,
      eventId: notifications.eventId,
      templateKey: notifications.templateKey,
    })
    .from(notifications)
    .where(eq(notifications.status, "failed"))
    .orderBy(asc(notifications.createdAt))
    .limit(limit);

  let retriedNotificationCount = 0;
  let sentNotificationCount = 0;
  let failedNotificationCount = 0;

  for (const candidate of candidates) {
    if (
      !candidate.memberId ||
      !candidate.eventId ||
      !isNotificationTemplate(candidate.templateKey)
    ) {
      await markNotificationFailed(db, candidate.id, "Notification payload is invalid.");
      failedNotificationCount++;
      continue;
    }

    const [claimed] = await db
      .update(notifications)
      .set({ status: "queued", errorMessage: null })
      .where(and(eq(notifications.id, candidate.id), eq(notifications.status, "failed")))
      .returning({ id: notifications.id });

    if (!claimed) continue;

    const payload = await buildNotificationPayload(db, {
      memberId: candidate.memberId,
      eventId: candidate.eventId,
      template: candidate.templateKey,
    });

    if (!payload) {
      await markNotificationFailed(db, candidate.id, "Notification payload is unavailable.");
      failedNotificationCount++;
      continue;
    }

    retriedNotificationCount++;
    const status = await deliverNotification(db, candidate.id, payload);
    if (status === "sent") sentNotificationCount++;
    if (status === "failed") failedNotificationCount++;
  }

  return {
    retriedNotificationCount,
    sentNotificationCount,
    failedNotificationCount,
  };
}

async function buildNotificationPayload(
  db: ReturnType<typeof getDb>,
  {
    memberId,
    eventId,
    template,
  }: {
    memberId: string;
    eventId: string;
    template: NotificationTemplate;
  },
): Promise<NotificationDeliveryPayload | null> {
  if (!isNotificationTemplate(template)) return null;

  const memberRows = await db
    .select({ telegramId: members.telegramId, notifyPrefs: members.notifyPrefs })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  const member = memberRows[0];
  if (!member) return null;

  const prefs = member.notifyPrefs ?? { rsvpUpdates: true, newEvents: true };
  const isRsvpNotification = (rsvpNotificationTemplates as readonly NotificationTemplate[]).includes(template);

  if (isRsvpNotification && !prefs.rsvpUpdates) return null;
  if (template === "new_event" && !prefs.newEvents) return null;

  const eventRows = await db
    .select({
      title: events.title,
      paymentDueDate: events.paymentDueDate,
      priceCents: events.priceCents,
      currency: events.currency,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const event = eventRows[0];
  if (!event) return null;

  const rsvpRows = await db
    .select({ paymentDeadlineAt: rsvps.paymentDeadlineAt })
    .from(rsvps)
    .where(and(eq(rsvps.memberId, memberId), eq(rsvps.eventId, eventId), sql`${rsvps.parentRsvpId} IS NULL`))
    .limit(1);

  const tz = (await getSiteSettings()).timezone;

  const text = buildMessage(template, {
    ...event,
    paymentDueDate: rsvpRows[0]?.paymentDeadlineAt ?? event.paymentDueDate,
  }, tz);

  return {
    chatId: member.telegramId,
    text,
  };
}

async function deliverNotification(
  db: ReturnType<typeof getDb>,
  notificationId: string,
  payload: NotificationDeliveryPayload,
): Promise<NotificationDeliveryStatus> {
  try {
    const messageId = await sendTelegramMessage({
      botToken: BOT_TOKEN,
      chatId: payload.chatId,
      text: payload.text,
      parseMode: "HTML",
    });

    await db
      .update(notifications)
      .set({
        status: "sent",
        telegramChatId: payload.chatId,
        telegramMessageId: messageId,
        sentAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    return "sent";
  } catch (err) {
    await markNotificationFailed(
      db,
      notificationId,
      err instanceof Error ? err.message : "Unknown error",
      payload.chatId,
    );
    return "failed";
  }
}

async function markNotificationFailed(
  db: ReturnType<typeof getDb>,
  notificationId: string,
  errorMessage: string,
  chatId?: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({
      status: "failed",
      ...(chatId ? { telegramChatId: chatId } : {}),
      errorMessage,
    })
    .where(eq(notifications.id, notificationId));
}

function isNotificationTemplate(value: string): value is NotificationTemplate {
  return notificationTemplates.includes(value as NotificationTemplate);
}
