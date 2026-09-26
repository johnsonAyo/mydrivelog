CREATE TABLE "lesson_debriefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"collection_booking_id" uuid,
	"legacy_booking_id" uuid,
	"private_notes" text DEFAULT '' NOT NULL,
	"what_we_worked_on" text DEFAULT '' NOT NULL,
	"what_to_practise" text DEFAULT '' NOT NULL,
	"next_lesson_focus" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_debriefs_exactly_one_booking" CHECK (("lesson_debriefs"."collection_booking_id" is not null) <> ("lesson_debriefs"."legacy_booking_id" is not null)),
	CONSTRAINT "lesson_debriefs_revision_nonnegative" CHECK ("lesson_debriefs"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "lesson_debriefs" ADD CONSTRAINT "lesson_debriefs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_debriefs" ADD CONSTRAINT "lesson_debriefs_collection_booking_id_collection_bookings_id_fk" FOREIGN KEY ("collection_booking_id") REFERENCES "public"."collection_bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_debriefs" ADD CONSTRAINT "lesson_debriefs_legacy_booking_id_bookings_id_fk" FOREIGN KEY ("legacy_booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_debriefs_collection_booking_unique" ON "lesson_debriefs" USING btree ("collection_booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_debriefs_legacy_booking_unique" ON "lesson_debriefs" USING btree ("legacy_booking_id");--> statement-breakpoint
CREATE INDEX "lesson_debriefs_workspace_updated_idx" ON "lesson_debriefs" USING btree ("workspace_id","updated_at");