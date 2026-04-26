import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  crmSyncStatuses,
  eventStatuses,
  eventTypes,
  memberGroupStatuses,
  notificationStatuses,
  rsvpStatuses,
  surveyStatuses,
} from "./types.js";

const lifecycleColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const memberGroupStatusEnum = pgEnum(
  "member_group_status",
  memberGroupStatuses,
);
export const eventTypeEnum = pgEnum("event_type", eventTypes);
export const eventStatusEnum = pgEnum("event_status", eventStatuses);
export const rsvpStatusEnum = pgEnum("rsvp_status", rsvpStatuses);
export const surveyStatusEnum = pgEnum("survey_status", surveyStatuses);
export const notificationStatusEnum = pgEnum(
  "notification_status",
  notificationStatuses,
);
export const crmSyncStatusEnum = pgEnum("crm_sync_status", crmSyncStatuses);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    telegramId: text("telegram_id").notNull(),
    telegramUsername: text("telegram_username"),
    telegramDisplayName: text("telegram_display_name").notNull(),
    telegramPhotoUrl: text("telegram_photo_url"),
    email: text("email"),
    groupStatus: memberGroupStatusEnum("group_status")
      .default("unknown")
      .notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    crmContactId: text("crm_contact_id"),
    ...lifecycleColumns,
  },
  (table) => [
    uniqueIndex("members_telegram_id_idx").on(table.telegramId),
    index("members_crm_contact_id_idx").on(table.crmContactId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: eventTypeEnum("type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    locationText: text("location_text"),
    capacity: integer("capacity").notNull(),
    status: eventStatusEnum("status").default("draft").notNull(),
    hiEventsEventId: text("hi_events_event_id"),
    ...lifecycleColumns,
  },
  (table) => [
    uniqueIndex("events_slug_idx").on(table.slug),
    index("events_status_idx").on(table.status),
    index("events_type_idx").on(table.type),
    index("events_hi_events_event_id_idx").on(table.hiEventsEventId),
  ],
);

export const rsvps = pgTable(
  "rsvps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull(),
    hiEventsOrderId: text("hi_events_order_id"),
    hiEventsAttendeeId: text("hi_events_attendee_id"),
    ticketType: text("ticket_type"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    ...lifecycleColumns,
  },
  (table) => [
    uniqueIndex("rsvps_member_event_idx").on(table.memberId, table.eventId),
    index("rsvps_event_status_idx").on(table.eventId, table.status),
    index("rsvps_hi_events_order_id_idx").on(table.hiEventsOrderId),
    index("rsvps_hi_events_attendee_id_idx").on(table.hiEventsAttendeeId),
  ],
);

export const surveys = pgTable(
  "surveys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: surveyStatusEnum("status").default("draft").notNull(),
    schemaJson: jsonb("schema_json").notNull(),
    ...lifecycleColumns,
  },
  (table) => [
    index("surveys_event_id_idx").on(table.eventId),
    index("surveys_status_idx").on(table.status),
  ],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    answersJson: jsonb("answers_json").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("survey_responses_survey_member_idx").on(
      table.surveyId,
      table.memberId,
    ),
    index("survey_responses_event_id_idx").on(table.eventId),
    index("survey_responses_member_id_idx").on(table.memberId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    telegramChatId: text("telegram_chat_id"),
    telegramMessageId: text("telegram_message_id"),
    templateKey: text("template_key").notNull(),
    status: notificationStatusEnum("status").default("queued").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    index("notifications_member_id_idx").on(table.memberId),
    index("notifications_event_id_idx").on(table.eventId),
    index("notifications_status_idx").on(table.status),
  ],
);

export const crmSyncLog = pgTable(
  "crm_sync_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    operation: text("operation").notNull(),
    status: crmSyncStatusEnum("status").default("pending").notNull(),
    remoteId: text("remote_id"),
    errorMessage: text("error_message"),
    ...lifecycleColumns,
  },
  (table) => [
    index("crm_sync_log_member_id_idx").on(table.memberId),
    index("crm_sync_log_event_id_idx").on(table.eventId),
    index("crm_sync_log_status_idx").on(table.status),
  ],
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Rsvp = typeof rsvps.$inferSelect;
export type NewRsvp = typeof rsvps.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type CrmSyncLog = typeof crmSyncLog.$inferSelect;
export type NewCrmSyncLog = typeof crmSyncLog.$inferInsert;

