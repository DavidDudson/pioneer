-- Hand-edited (ADR-0062): entries are archived, never deleted. A homebrew entry is archived by its author, an official
-- one by the content seed when it leaves its pack (the seed used to delete it). archive.protect makes the database
-- refuse a delete or truncate of content_entries at all.
ALTER TABLE "content_entries" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
SELECT archive.protect('content_entries');
