CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('open', 'booked', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."weekly_booking_allowance" AS ENUM('unlimited', 'two', 'one');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "availability_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_slots_positive_duration" CHECK ("availability_slots"."ends_at" > "availability_slots"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "instructor_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instructor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_identity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "workspace_status" DEFAULT 'active' NOT NULL,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"default_session_minutes" integer DEFAULT 120 NOT NULL,
	"buffer_warning_minutes" integer DEFAULT 30 NOT NULL,
	"weekly_booking_allowance" "weekly_booking_allowance" DEFAULT 'unlimited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_default_session_positive" CHECK ("workspaces"."default_session_minutes" > 0),
	CONSTRAINT "workspaces_buffer_warning_allowed" CHECK ("workspaces"."buffer_warning_minutes" in (0, 15, 30, 45, 60))
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_sessions" ADD CONSTRAINT "instructor_sessions_identity_id_instructor_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."instructor_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_identity_id_instructor_identities_id_fk" FOREIGN KEY ("owner_identity_id") REFERENCES "public"."instructor_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_slots_workspace_start_idx" ON "availability_slots" USING btree ("workspace_id","starts_at");--> statement-breakpoint
-- Protect the scheduling invariant under concurrent requests. Application checks
-- provide useful conflict messages; this exclusion constraint is authoritative.
ALTER TABLE "availability_slots"
  ADD CONSTRAINT "availability_slots_no_workspace_overlap"
  EXCLUDE USING gist (
    "workspace_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("status" <> 'withdrawn');--> statement-breakpoint
CREATE UNIQUE INDEX "instructor_identities_email_unique" ON "instructor_identities" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "instructor_sessions_token_hash_unique" ON "instructor_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "instructor_sessions_identity_idx" ON "instructor_sessions" USING btree ("identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_unique" ON "workspaces" USING btree ("owner_identity_id");
