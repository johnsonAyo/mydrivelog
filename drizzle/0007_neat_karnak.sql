ALTER TABLE "auth_challenges" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "instructor_identities" ADD COLUMN "firebase_uid" text;--> statement-breakpoint
ALTER TABLE "instructor_identities" ADD COLUMN "full_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX "instructor_identities_firebase_uid_unique" ON "instructor_identities" USING btree ("firebase_uid");