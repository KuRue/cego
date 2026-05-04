export const memberGroupStatuses = ["unknown", "member", "not_member"] as const;
export type MemberGroupStatus = (typeof memberGroupStatuses)[number];

export const eventStatuses = [
  "draft",
  "show",
  "closed",
  "archived",
] as const;
export type EventStatus = (typeof eventStatuses)[number];

export const rsvpStatuses = ["confirmed", "waitlisted", "cancelled"] as const;
export type RsvpStatus = (typeof rsvpStatuses)[number];

export const rsvpPaymentStatuses = ["unpaid", "pending", "paid", "waived"] as const;
export type RsvpPaymentStatus = (typeof rsvpPaymentStatuses)[number];

export const surveyStatuses = ["draft", "published", "closed"] as const;
export type SurveyStatus = (typeof surveyStatuses)[number];

export const notificationStatuses = ["queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];
