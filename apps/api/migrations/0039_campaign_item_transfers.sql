-- Hand-edited: the foreign keys from from_character_id and to_character_id to characters (restrict: characters are
-- archived, never deleted), as campaign.table.ts may not import the character context's table; archive.protect
-- (ADR-0062), as an offer is kept as history, never deleted; and audit.enable, as every public table is audited.
CREATE TABLE "campaign_item_transfers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"from_character_id" uuid NOT NULL,
	"to_character_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"giver_version" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_item_transfers" ADD CONSTRAINT "campaign_item_transfers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_item_transfers_campaign_idx" ON "campaign_item_transfers" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "campaign_item_transfers_from_idx" ON "campaign_item_transfers" USING btree ("from_character_id");--> statement-breakpoint
CREATE INDEX "campaign_item_transfers_to_idx" ON "campaign_item_transfers" USING btree ("to_character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_item_transfers_pending_item_idx" ON "campaign_item_transfers" USING btree ("from_character_id","item_id") WHERE "campaign_item_transfers"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "campaign_item_transfers" ADD CONSTRAINT "campaign_item_transfers_from_character_id_characters_id_fk" FOREIGN KEY ("from_character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_item_transfers" ADD CONSTRAINT "campaign_item_transfers_to_character_id_characters_id_fk" FOREIGN KEY ("to_character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('campaign_item_transfers');--> statement-breakpoint
SELECT audit.enable('campaign_item_transfers');
