-- Hand-edited: backfills the two columns from each stored document's ancestry and class slot picks, as the repository
-- keeps them in step from now on. A document with no pick there, or one an older schema version still holds under
-- another shape, stays null until its next save; a value that is not a uuid is left null too.
ALTER TABLE "characters" ADD COLUMN "ancestry_id" uuid;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "class_id" uuid;--> statement-breakpoint
UPDATE "characters" SET
	"ancestry_id" = CASE WHEN "document" #>> '{build,choices,ancestry}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ("document" #>> '{build,choices,ancestry}')::uuid END,
	"class_id" = CASE WHEN "document" #>> '{build,choices,class}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ("document" #>> '{build,choices,class}')::uuid END;--> statement-breakpoint
CREATE INDEX "characters_owner_level_idx" ON "characters" USING btree ("owner_id","level");--> statement-breakpoint
CREATE INDEX "characters_owner_class_idx" ON "characters" USING btree ("owner_id","class_id");--> statement-breakpoint
CREATE INDEX "characters_owner_ancestry_idx" ON "characters" USING btree ("owner_id","ancestry_id");