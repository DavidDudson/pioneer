-- Hand-edited: foreign key from enabled_by to users (campaign.table.ts may not import identity's tables). Set null,
-- not cascade: a campaign keeps its packs when the user who enabled them is deleted.
ALTER TABLE "campaign_packs" ADD COLUMN "enabled_by" uuid;--> statement-breakpoint
ALTER TABLE "campaign_packs" ADD CONSTRAINT "campaign_packs_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_packs_enabled_by_idx" ON "campaign_packs" USING btree ("enabled_by");
