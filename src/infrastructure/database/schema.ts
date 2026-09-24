import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("instructor_identities_email_unique").on(sql`lower(${table.email})`)],
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
    weeklyBookingAllowance: weeklyBookingAllowance("weekly_booking_allowance")
      .notNull()
      .default("unlimited"),
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
  ],
);

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
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
    status: availabilityStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("availability_slots_workspace_start_idx").on(table.workspaceId, table.startsAt),
    check("availability_slots_positive_duration", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);
