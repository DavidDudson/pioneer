-- Hand-edited: foreign keys from pack_id to content_packs (deleting a pack takes it out of its characters) and from
-- enabled_by to users (set null: a character keeps its packs when the user who enabled them is deleted), as
-- character.table.ts may not import the rules or identity contexts' tables; and audit.enable, as every public table is
-- audited.
CREATE TABLE "character_packs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL,
	"enabled_by" uuid,
	"enabled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_packs" ADD CONSTRAINT "character_packs_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_packs_character_pack_idx" ON "character_packs" USING btree ("character_id","pack_id");--> statement-breakpoint
CREATE INDEX "character_packs_pack_idx" ON "character_packs" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "character_packs_enabled_by_idx" ON "character_packs" USING btree ("enabled_by");--> statement-breakpoint
ALTER TABLE "character_packs" ADD CONSTRAINT "character_packs_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_packs" ADD CONSTRAINT "character_packs_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('character_packs');
