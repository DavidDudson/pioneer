-- Hand-edited: the foreign key from holder_id to characters (restrict: characters are archived, never deleted), as
-- campaign.table.ts may not import the character context's table; archive.protect (ADR-0062), as a key item is archived,
-- never deleted; and audit.enable, as every public table is audited.
CREATE TABLE "campaign_key_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_item_id" uuid NOT NULL,
	"base_item_name" text NOT NULL,
	"runes" jsonb NOT NULL,
	"notes" text NOT NULL,
	"holder_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "campaign_key_items" ADD CONSTRAINT "campaign_key_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_key_items_campaign_idx" ON "campaign_key_items" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "campaign_key_items_holder_idx" ON "campaign_key_items" USING btree ("holder_id");--> statement-breakpoint
ALTER TABLE "campaign_key_items" ADD CONSTRAINT "campaign_key_items_holder_id_characters_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('campaign_key_items');--> statement-breakpoint
SELECT audit.enable('campaign_key_items');
