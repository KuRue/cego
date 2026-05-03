export const memberGroupStatuses = ["unknown", "member", "not_member"] as const;
export type MemberGroupStatus = (typeof memberGroupStatuses)[number];

export const eventTypes = ["major_event", "local_event"] as const;
export type EventType = (typeof eventTypes)[number];

export const eventStatuses = [
  "draft",
  "open",
  "full",
  "closed",
  "archived",
] as const;
export type EventStatus = (typeof eventStatuses)[number];

export const rsvpStatuses = ["confirmed", "waitlisted", "cancelled"] as const;
export type RsvpStatus = (typeof rsvpStatuses)[number];

export const surveyStatuses = ["draft", "published", "closed"] as const;
export type SurveyStatus = (typeof surveyStatuses)[number];

export const notificationStatuses = ["queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];
