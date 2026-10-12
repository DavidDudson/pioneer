-- Hand-edited: foreign key from user_id to users (character.table.ts may not import identity's tables; deleting a
-- user forgets their tabs), and audit.enable, as every public table is audited.
CREATE TABLE "character_sheet_modes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_sheet_modes" ADD CONSTRAINT "character_sheet_modes_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_sheet_modes_user_character_idx" ON "character_sheet_modes" USING btree ("user_id","character_id");--> statement-breakpoint
CREATE INDEX "character_sheet_modes_character_idx" ON "character_sheet_modes" USING btree ("character_id");--> statement-breakpoint
ALTER TABLE "character_sheet_modes" ADD CONSTRAINT "character_sheet_modes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('character_sheet_modes');
