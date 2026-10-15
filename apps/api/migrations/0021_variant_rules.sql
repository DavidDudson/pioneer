-- Hand-edited: foreign keys from enabled_by to users (set null: a campaign or character keeps its variant rules when
-- the user who enabled them is deleted), as campaign.table.ts and character.table.ts may not import the identity
-- context's tables; and audit.enable, as every public table is audited. variant_id has no foreign key on purpose: a
-- variant rule whose pack is not in use is left out when the set is read, and comes back with its pack (ADR-0061).
CREATE TABLE "campaign_variant_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"enabled_by" uuid,
	"enabled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_variant_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"enabled_by" uuid,
	"enabled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_variant_rules" ADD CONSTRAINT "campaign_variant_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variant_rules" ADD CONSTRAINT "character_variant_rules_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_variant_rules_campaign_variant_idx" ON "campaign_variant_rules" USING btree ("campaign_id","variant_id");--> statement-breakpoint
CREATE INDEX "campaign_variant_rules_enabled_by_idx" ON "campaign_variant_rules" USING btree ("enabled_by");--> statement-breakpoint
CREATE UNIQUE INDEX "character_variant_rules_character_variant_idx" ON "character_variant_rules" USING btree ("character_id","variant_id");--> statement-breakpoint
CREATE INDEX "character_variant_rules_enabled_by_idx" ON "character_variant_rules" USING btree ("enabled_by");--> statement-breakpoint
ALTER TABLE "campaign_variant_rules" ADD CONSTRAINT "campaign_variant_rules_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variant_rules" ADD CONSTRAINT "character_variant_rules_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('campaign_variant_rules');--> statement-breakpoint
SELECT audit.enable('character_variant_rules');
