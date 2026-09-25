CREATE TABLE "availability_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"confirmation_email_status" text DEFAULT 'not_sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_general_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_general_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"email_status" text DEFAULT 'not_sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_slots_positive_duration" CHECK ("collection_slots"."ends_at" > "collection_slots"."starts_at"),
	CONSTRAINT "collection_slots_valid_status" CHECK ("collection_slots"."status" in ('private', 'open', 'booked', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "availability_collections" ADD CONSTRAINT "availability_collections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_bookings" ADD CONSTRAINT "collection_bookings_collection_id_availability_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."availability_collections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_bookings" ADD CONSTRAINT "collection_bookings_slot_id_collection_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."collection_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_general_access" ADD CONSTRAINT "collection_general_access_collection_id_availability_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."availability_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_general_links" ADD CONSTRAINT "collection_general_links_collection_id_availability_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."availability_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_invitations" ADD CONSTRAINT "collection_invitations_collection_id_availability_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."availability_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_slots" ADD CONSTRAINT "collection_slots_collection_id_availability_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."availability_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_collections_workspace_idx" ON "availability_collections" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "collection_bookings_collection_idx" ON "collection_bookings" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_bookings_one_active_per_slot" ON "collection_bookings" USING btree ("slot_id") WHERE "collection_bookings"."status" = 'confirmed';--> statement-breakpoint
CREATE UNIQUE INDEX "collection_general_access_token_unique" ON "collection_general_access" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_general_links_collection_unique" ON "collection_general_links" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_general_links_token_unique" ON "collection_general_links" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_invitations_token_unique" ON "collection_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_invitations_email_unique" ON "collection_invitations" USING btree ("collection_id",lower("email"));--> statement-breakpoint
CREATE INDEX "collection_slots_collection_start_idx" ON "collection_slots" USING btree ("collection_id","starts_at");