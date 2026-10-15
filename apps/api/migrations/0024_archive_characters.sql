-- Hand-edited (ADR-0062): characters are archived, never deleted. The owner's foreign key to users (0005) was on
-- delete cascade, so removing a user removed their characters; it is restrict now, and archive.protect makes the
-- database refuse a delete or truncate of characters at all.
ALTER TABLE "characters" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "characters" DROP CONSTRAINT "characters_owner_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('characters');
