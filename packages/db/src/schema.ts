import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  eventStatuses,
  eventTypes,
  memberGroupStatuses,
  notificationStatuses,
  rsvpStatuses,
  surveyStatuses,
} from "./types";

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
    ...lifecycleColumns,
  },
  (table) => [uniqueIndex("members_telegram_id_idx").on(table.telegramId)],
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

export const memberTags = pgTable(
  "member_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    color: text("color").default("gray").notNull(),
    ...lifecycleColumns,
  },
  (table) => [uniqueIndex("member_tags_name_idx").on(table.name)],
);

export const memberTagAssignments = pgTable(
  "member_tag_assignments",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => memberTags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.memberId, table.tagId],
      name: "member_tag_assignments_pk",
    }),
    index("member_tag_assignments_member_id_idx").on(table.memberId),
    index("member_tag_assignments_tag_id_idx").on(table.tagId),
  ],
);

export const memberNotes = pgTable(
  "member_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    authorMemberId: uuid("author_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    ...lifecycleColumns,
  },
  (table) => [
    index("member_notes_member_id_idx").on(table.memberId),
    index("member_notes_author_member_id_idx").on(table.authorMemberId),
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
export type MemberTag = typeof memberTags.$inferSelect;
export type NewMemberTag = typeof memberTags.$inferInsert;
export type MemberTagAssignment = typeof memberTagAssignments.$inferSelect;
export type NewMemberTagAssignment = typeof memberTagAssignments.$inferInsert;
export type MemberNote = typeof memberNotes.$inferSelect;
export type NewMemberNote = typeof memberNotes.$inferInsert;
