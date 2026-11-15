-- Hand-edited: archive.protect (ADR-0062), as a replaced or released companion is archived, never deleted; and
-- audit.enable, as every public table is audited.
CREATE TABLE "character_companions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"form" jsonb NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone,
	"archive_reason" text
);
--> statement-breakpoint
ALTER TABLE "character_companions" ADD CONSTRAINT "character_companions_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_companions_live_kind_idx" ON "character_companions" USING btree ("character_id","kind") WHERE "character_companions"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "character_companions_character_idx" ON "character_companions" USING btree ("character_id","created_at","id");--> statement-breakpoint
SELECT archive.protect('character_companions');--> statement-breakpoint
SELECT audit.enable('character_companions');
