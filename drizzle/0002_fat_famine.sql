CREATE TABLE "availability_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"availability_id" uuid NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"availability_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"confirmation_email_status" text DEFAULT 'not_sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_positive_duration" CHECK ("bookings"."ends_at" > "bookings"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "release_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"email_status" text DEFAULT 'not_sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD COLUMN "session_minutes" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD COLUMN "buffer_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_releases" ADD CONSTRAINT "availability_releases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_releases" ADD CONSTRAINT "availability_releases_availability_id_availability_slots_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."availability_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_availability_id_availability_slots_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."availability_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_recipient_id_release_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."release_recipients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_recipients" ADD CONSTRAINT "release_recipients_release_id_availability_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."availability_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_releases_window_idx" ON "availability_releases" USING btree ("availability_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_window_start_unique" ON "bookings" USING btree ("availability_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_workspace_start_idx" ON "bookings" USING btree ("workspace_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "release_recipients_token_unique" ON "release_recipients" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_session_minutes_positive" CHECK ("availability_slots"."session_minutes" > 0);--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_buffer_minutes_nonnegative" CHECK ("availability_slots"."buffer_minutes" >= 0);