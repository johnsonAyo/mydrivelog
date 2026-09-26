CREATE TABLE "lesson_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debrief_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"shared_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_messages_kind" CHECK ("lesson_messages"."kind" in ('recap', 'follow_up')),
	CONSTRAINT "lesson_messages_status" CHECK ("lesson_messages"."status" in ('queued', 'sending', 'delivered', 'needs_attention'))
);
--> statement-breakpoint
CREATE TABLE "lesson_skill_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debrief_id" uuid NOT NULL,
	"skill" text NOT NULL,
	"outcome" text NOT NULL,
	CONSTRAINT "lesson_skill_assessments_outcome" CHECK ("lesson_skill_assessments"."outcome" in ('introduced', 'developing', 'confident'))
);
--> statement-breakpoint
ALTER TABLE "lesson_messages" ADD CONSTRAINT "lesson_messages_debrief_id_lesson_debriefs_id_fk" FOREIGN KEY ("debrief_id") REFERENCES "public"."lesson_debriefs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_skill_assessments" ADD CONSTRAINT "lesson_skill_assessments_debrief_id_lesson_debriefs_id_fk" FOREIGN KEY ("debrief_id") REFERENCES "public"."lesson_debriefs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_messages_debrief_key_unique" ON "lesson_messages" USING btree ("debrief_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_messages_one_recap_unique" ON "lesson_messages" USING btree ("debrief_id") WHERE "lesson_messages"."kind" = 'recap';--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_skill_assessments_unique" ON "lesson_skill_assessments" USING btree ("debrief_id",lower("skill"));