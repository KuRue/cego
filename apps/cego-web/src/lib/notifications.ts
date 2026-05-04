import {
  events,
  getDb,
  members,
  notifications,
} from "@cego/db";
import { eq } from "@cego/db";
import { sendTelegramMessage } from "@cego/telegram";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

type NotificationTemplate =
  | "rsvp_confirmed"
  | "rsvp_waitlisted"
  | "rsvp_promoted"
  | "rsvp_cancelled"
  | "payment_confirmed"
  | "payment_waived"
  | "payment_reminder"
  | "new_event";

function buildMessage(
  template: NotificationTemplate,
  event: { title: string; paymentDueDate: Date | null; priceCents: number | null; currency: string },
): string {
  switch (template) {
    case "rsvp_confirmed": {
      let msg = `✅ You're confirmed for *${event.title}*!`;
      if (event.paymentDueDate) {
        const due = formatDate(event.paymentDueDate);
        msg += `\n\n💳 Payment is due by ${due}.`;
      }
      return msg;
    }
    case "rsvp_waitlisted":
      return `⏳ You've been waitlisted for *${event.title}*. You'll be notified if a spot opens up.`;
    case "rsvp_promoted":
      return `🎉 A spot opened up — you're now *confirmed* for *${event.title}*!${event.paymentDueDate ? `\n\n💳 Payment is due by ${formatDate(event.paymentDueDate)}.` : ""}`;
    case "rsvp_cancelled":
      return `❌ Your RSVP for *${event.title}* has been cancelled.`;
    case "payment_confirmed":
      return `✅ Payment confirmed for *${event.title}*. You're all set!`;
    case "payment_waived":
      return `✅ Payment has been waived for *${event.title}*. You're all set!`;
    case "payment_reminder": {
      const due = event.paymentDueDate ? formatDate(event.paymentDueDate) : "soon";
      return `⏰ Reminder: Payment for *${event.title}* is due by ${due}.`;
    }
    case "new_event":
      return `🎉 New event: *${event.title}*. Check it out and RSVP!`;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

  const memberRows = await db
    .select({ telegramId: members.telegramId, notifyPrefs: members.notifyPrefs })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  const member = memberRows[0];
  if (!member) return;

  const prefs = member.notifyPrefs ?? { rsvpUpdates: true, newEvents: true };
  const isRsvpNotification = [
    "rsvp_confirmed",
    "rsvp_waitlisted",
    "rsvp_promoted",
    "rsvp_cancelled",
    "payment_confirmed",
    "payment_waived",
    "payment_reminder",
  ].includes(template);

  if (isRsvpNotification && !prefs.rsvpUpdates) return;
  if (template === "new_event" && !prefs.newEvents) return;

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
  if (!event) return;

  const text = buildMessage(template, event);
  const chatId = member.telegramId;

  const [row] = await db
    .insert(notifications)
    .values({
      memberId,
      eventId,
      telegramChatId: chatId,
      templateKey: template,
      status: "queued",
    })
    .returning({ id: notifications.id });

  try {
    const messageId = await sendTelegramMessage({
      botToken: BOT_TOKEN,
      chatId,
      text,
      parseMode: "Markdown",
    });

    await db
      .update(notifications)
      .set({
        status: "sent",
        telegramMessageId: messageId,
        sentAt: new Date(),
      })
      .where(eq(notifications.id, row.id));
  } catch (err) {
    await db
      .update(notifications)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      })
      .where(eq(notifications.id, row.id));
  }
}
