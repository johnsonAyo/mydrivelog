ALTER TYPE "public"."weekly_booking_allowance" ADD VALUE 'three';--> statement-breakpoint
ALTER TYPE "public"."weekly_booking_allowance" ADD VALUE 'four';--> statement-breakpoint
ALTER TYPE "public"."weekly_booking_allowance" ADD VALUE 'five';--> statement-breakpoint
CREATE TABLE "learner_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"source_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "minimum_booking_notice_hours" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "learner_contacts" ADD CONSTRAINT "learner_contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learner_contacts_workspace_source_unique" ON "learner_contacts" USING btree ("workspace_id",lower("source_email"));--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_notice_allowed" CHECK ("workspaces"."minimum_booking_notice_hours" in (0, 12, 24, 48));