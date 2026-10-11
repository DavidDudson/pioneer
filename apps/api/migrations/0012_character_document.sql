-- Hand-edited: characters are stored as their document (#416). Existing rows are backfilled at schema version 1
-- with their ancestry as the `ancestry` slot's selection; every other part of the document takes its default when
-- read. `attributes` stays until #418, which works modifiers out from boost picks: stored modifiers are derived and
-- can't be turned back into boosts, so they never enter the document.
ALTER TABLE "characters" ADD COLUMN "schema_version" smallint;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "document" jsonb;--> statement-breakpoint
UPDATE "characters" SET
	"schema_version" = 1,
	"document" = jsonb_build_object(
		'schemaVersion', 1,
		'id', "id",
		'ownerId', "owner_id",
		'name', "name",
		'level', "level",
		'build', jsonb_build_object('choices', jsonb_build_object('ancestry', "ancestry"))
	);--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "schema_version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "document" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN "ancestry";
