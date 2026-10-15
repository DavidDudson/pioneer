-- Hand-edited (ADR-0062): campaigns are archived, never deleted. The GM's foreign key to users (0007) was on delete
-- cascade, so removing a user removed the campaigns they run; it is restrict now, and archive.protect makes the
-- database refuse a delete or truncate of campaigns at all.
ALTER TABLE "campaigns" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_gm_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_gm_id_users_id_fk" FOREIGN KEY ("gm_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('campaigns');
