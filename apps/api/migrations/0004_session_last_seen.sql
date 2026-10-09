-- Hand-edited: sessions from before this migration count as last seen when created.
ALTER TABLE "sessions" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
UPDATE "sessions" SET "last_seen_at" = "created_at";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "last_seen_at" SET NOT NULL;--> statement-breakpoint
DROP INDEX "sessions_user_id_idx";--> statement-breakpoint
CREATE INDEX "sessions_user_last_seen_idx" ON "sessions" USING btree ("user_id","last_seen_at","id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");
