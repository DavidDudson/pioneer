-- Hand-edited: the foreign key from acknowledged_by to users (set null: a character keeps its acknowledgements when
-- the owner who gave them is deleted), as character.table.ts may not import the identity context's tables;
-- archive.protect (ADR-0062), as a revoked acknowledgement is archived, never deleted; and audit.enable, as every
-- public table is audited.
CREATE TABLE "character_item_acknowledgements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"rule" text NOT NULL,
	"rune" uuid NOT NULL,
	"value" smallint NOT NULL,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "character_item_acknowledgements" ADD CONSTRAINT "character_item_acknowledgements_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_item_acknowledgements_live_idx" ON "character_item_acknowledgements" USING btree ("character_id","item_id","rule","rune") WHERE "character_item_acknowledgements"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "character_item_acknowledgements_character_idx" ON "character_item_acknowledgements" USING btree ("character_id","acknowledged_at","id") WHERE "character_item_acknowledgements"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "character_item_acknowledgements_acknowledged_by_idx" ON "character_item_acknowledgements" USING btree ("acknowledged_by");
--> statement-breakpoint
ALTER TABLE "character_item_acknowledgements" ADD CONSTRAINT "character_item_acknowledgements_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('character_item_acknowledgements');--> statement-breakpoint
SELECT audit.enable('character_item_acknowledgements');
