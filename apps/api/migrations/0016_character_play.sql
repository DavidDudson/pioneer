-- Hand-edited: one play row for every existing character, at full Hit Points (new characters get theirs with the
-- insert), and audit.enable, as every public table is audited.
CREATE TABLE "character_play" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"play_revision" integer NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_play" ADD CONSTRAINT "character_play_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_play_character_idx" ON "character_play" USING btree ("character_id");--> statement-breakpoint
INSERT INTO "character_play" ("id", "character_id", "play_revision", "state", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 1, '{"hp":{"damage":0,"temp":0}}'::jsonb, now(), now() FROM "characters";
--> statement-breakpoint
SELECT audit.enable('character_play');
