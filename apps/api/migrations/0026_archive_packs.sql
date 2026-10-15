-- Hand-edited (ADR-0062): homebrew packs are archived, never deleted. The owner's foreign key to users (0011) was on
-- delete cascade, so removing a user removed their homebrew packs; it is restrict now, and archive.protect makes the
-- database refuse a delete or truncate of content_packs at all. Official packs stay as the seed leaves them.
ALTER TABLE "content_packs" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_packs" DROP CONSTRAINT "content_packs_owner_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('content_packs');
