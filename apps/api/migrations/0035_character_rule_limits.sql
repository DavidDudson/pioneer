-- Hand-edited: the foreign key from set_by to users (set null: a character keeps its limits when the user who set them is
-- deleted), as character.table.ts may not import the identity context's tables; and audit.enable, as every public table is
-- audited.
CREATE TABLE "character_rule_limits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"limit" text NOT NULL,
	"value" smallint NOT NULL,
	"set_by" uuid,
	"set_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_rule_limits" ADD CONSTRAINT "character_rule_limits_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_rule_limits_character_limit_idx" ON "character_rule_limits" USING btree ("character_id","limit");--> statement-breakpoint
CREATE INDEX "character_rule_limits_set_by_idx" ON "character_rule_limits" USING btree ("set_by");--> statement-breakpoint
ALTER TABLE "character_rule_limits" ADD CONSTRAINT "character_rule_limits_set_by_users_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('character_rule_limits');
