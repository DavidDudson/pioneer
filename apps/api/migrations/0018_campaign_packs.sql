-- Hand-edited: foreign key from pack_id to content_packs (campaign.table.ts may not import the rules context's
-- tables; deleting a pack takes it out of its campaigns), and audit.enable, as every public table is audited.
CREATE TABLE "campaign_packs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL,
	"enabled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_packs" ADD CONSTRAINT "campaign_packs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_packs_campaign_pack_idx" ON "campaign_packs" USING btree ("campaign_id","pack_id");--> statement-breakpoint
CREATE INDEX "campaign_packs_pack_idx" ON "campaign_packs" USING btree ("pack_id");--> statement-breakpoint
ALTER TABLE "campaign_packs" ADD CONSTRAINT "campaign_packs_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('campaign_packs');
