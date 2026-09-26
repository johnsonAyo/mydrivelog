import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
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

export const workspaceStatus = pgEnum("workspace_status", ["active", "suspended"]);
export const weeklyBookingAllowance = pgEnum("weekly_booking_allowance", [
  "unlimited",
  "two",
  "one",
  "three",
  "four",
  "five",
]);
export const availabilityStatus = pgEnum("availability_status", [
  "open",
  "booked",
  "withdrawn",
]);

export const instructorIdentities = pgTable(
  "instructor_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    firebaseUid: text("firebase_uid"),
    fullName: text("full_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("instructor_identities_email_unique").on(sql`lower(${table.email})`),
    uniqueIndex("instructor_identities_firebase_uid_unique").on(table.firebaseUid),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerIdentityId: uuid("owner_identity_id")
      .notNull()
      .references(() => instructorIdentities.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    status: workspaceStatus("status").notNull().default("active"),
    timezone: text("timezone").notNull().default("Europe/London"),
    defaultSessionMinutes: integer("default_session_minutes").notNull().default(120),
    bufferWarningMinutes: integer("buffer_warning_minutes").notNull().default(30),
    minimumBookingNoticeHours: integer("minimum_booking_notice_hours").notNull().default(0),
    contactPhone: text("contact_phone"),
    weeklyBookingAllowance: weeklyBookingAllowance("weekly_booking_allowance")
      .notNull()
      .default("unlimited"),
    pilotActive: boolean("pilot_active").notNull().default(true),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    paidThrough: timestamp("paid_through", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workspaces_owner_unique").on(table.ownerIdentityId),
    check("workspaces_default_session_positive", sql`${table.defaultSessionMinutes} > 0`),
    check("workspaces_buffer_warning_allowed", sql`${table.bufferWarningMinutes} in (0, 15, 30, 45, 60)`),
    check("workspaces_notice_allowed", sql`${table.minimumBookingNoticeHours} in (0, 12, 24, 48)`),
  ],
);

export const learnerContacts = pgTable("learner_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  sourceEmail: text("source_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("learner_contacts_workspace_source_unique").on(table.workspaceId, sql`lower(${table.sourceEmail})`)]);

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_challenges_token_hash_unique").on(table.tokenHash),
    index("auth_challenges_email_created_idx").on(table.email, table.createdAt),
  ],
);

export const instructorSessions = pgTable(
  "instructor_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identityId: uuid("identity_id")
      .notNull()
      .references(() => instructorIdentities.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("instructor_sessions_token_hash_unique").on(table.tokenHash),
    index("instructor_sessions_identity_idx").on(table.identityId),
  ],
);

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    sessionMinutes: integer("session_minutes").notNull().default(120),
    bufferMinutes: integer("buffer_minutes").notNull().default(30),
    status: availabilityStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("availability_slots_workspace_start_idx").on(table.workspaceId, table.startsAt),
    check("availability_slots_positive_duration", sql`${table.endsAt} > ${table.startsAt}`),
    check("availability_slots_session_minutes_positive", sql`${table.sessionMinutes} > 0`),
    check("availability_slots_buffer_minutes_nonnegative", sql`${table.bufferMinutes} >= 0`),
  ],
);

export const availabilityReleases = pgTable("availability_releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  availabilityId: uuid("availability_id").notNull().references(() => availabilitySlots.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("published"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("availability_releases_window_idx").on(table.availabilityId)]);

export const releaseRecipients = pgTable("release_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").notNull().references(() => availabilityReleases.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  emailStatus: text("email_status").notNull().default("not_sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("release_recipients_token_unique").on(table.tokenHash)]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  availabilityId: uuid("availability_id").notNull().references(() => availabilitySlots.id, { onDelete: "restrict" }),
  recipientId: uuid("recipient_id").notNull().references(() => releaseRecipients.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("confirmed"),
  confirmationEmailStatus: text("confirmation_email_status").notNull().default("not_sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("bookings_window_start_unique").on(table.availabilityId, table.startsAt),
  index("bookings_workspace_start_idx").on(table.workspaceId, table.startsAt),
  check("bookings_positive_duration", sql`${table.endsAt} > ${table.startsAt}`),
]);

// Exact lesson times are grouped into weekly drafts.
export const availabilityCollections = pgTable("availability_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weekStart: date("week_start", { mode: "string" }).notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("availability_collections_workspace_idx").on(table.workspaceId, table.updatedAt),
  uniqueIndex("availability_collections_workspace_week_unique").on(table.workspaceId, table.weekStart),
]);

export const collectionSlots = pgTable("collection_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => availabilityCollections.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("collection_slots_collection_start_idx").on(table.collectionId, table.startsAt),
  check("collection_slots_positive_duration", sql`${table.endsAt} > ${table.startsAt}`),
  check("collection_slots_valid_status", sql`${table.status} in ('private', 'open', 'booked', 'closed')`),
]);

export const collectionInvitations = pgTable("collection_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => availabilityCollections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  emailStatus: text("email_status").notNull().default("not_sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("collection_invitations_token_unique").on(table.tokenHash),
  uniqueIndex("collection_invitations_email_unique").on(table.collectionId, sql`lower(${table.email})`),
]);

export const collectionGeneralLinks = pgTable("collection_general_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => availabilityCollections.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("collection_general_links_collection_unique").on(table.collectionId),
  uniqueIndex("collection_general_links_token_unique").on(table.tokenHash),
]);

export const collectionGeneralAccess = pgTable("collection_general_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => availabilityCollections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("collection_general_access_token_unique").on(table.tokenHash)]);

export const collectionBookings = pgTable("collection_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => availabilityCollections.id, { onDelete: "restrict" }),
  slotId: uuid("slot_id").notNull().references(() => collectionSlots.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("confirmed"),
  confirmationEmailStatus: text("confirmation_email_status").notNull().default("not_sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("collection_bookings_collection_idx").on(table.collectionId),
  uniqueIndex("collection_bookings_one_active_per_slot").on(table.slotId).where(sql`${table.status} = 'confirmed'`),
]);

// A debrief belongs to the booking, not its availability slot: moving a lesson does not
// transfer private notes to whoever might book the vacated time. Both booking models
// remain readable while older availability records are still supported.
export const lessonDebriefs = pgTable("lesson_debriefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  collectionBookingId: uuid("collection_booking_id").references(() => collectionBookings.id, { onDelete: "restrict" }),
  legacyBookingId: uuid("legacy_booking_id").references(() => bookings.id, { onDelete: "restrict" }),
  privateNotes: text("private_notes").notNull().default(""),
  whatWeWorkedOn: text("what_we_worked_on").notNull().default(""),
  whatToPractise: text("what_to_practise").notNull().default(""),
  nextLessonFocus: text("next_lesson_focus").notNull().default(""),
  revision: integer("revision").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lesson_debriefs_collection_booking_unique").on(table.collectionBookingId),
  uniqueIndex("lesson_debriefs_legacy_booking_unique").on(table.legacyBookingId),
  index("lesson_debriefs_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
  check("lesson_debriefs_exactly_one_booking", sql`(${table.collectionBookingId} is not null) <> (${table.legacyBookingId} is not null)`),
  check("lesson_debriefs_revision_nonnegative", sql`${table.revision} >= 0`),
]);

export const lessonSkillAssessments = pgTable("lesson_skill_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  debriefId: uuid("debrief_id").notNull().references(() => lessonDebriefs.id, { onDelete: "cascade" }),
  skill: text("skill").notNull(),
  outcome: text("outcome").notNull(),
}, (table) => [
  uniqueIndex("lesson_skill_assessments_unique").on(table.debriefId, sql`lower(${table.skill})`),
  check("lesson_skill_assessments_outcome", sql`${table.outcome} in ('introduced', 'developing', 'confident')`),
]);

export const lessonMessages = pgTable("lesson_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  debriefId: uuid("debrief_id").notNull().references(() => lessonDebriefs.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sharedSnapshot: jsonb("shared_snapshot").notNull(),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lesson_messages_debrief_key_unique").on(table.debriefId, table.idempotencyKey),
  uniqueIndex("lesson_messages_one_recap_unique").on(table.debriefId).where(sql`${table.kind} = 'recap'`),
  check("lesson_messages_kind", sql`${table.kind} in ('recap', 'follow_up')`),
  check("lesson_messages_status", sql`${table.status} in ('queued', 'sending', 'delivered', 'needs_attention')`),
]);
