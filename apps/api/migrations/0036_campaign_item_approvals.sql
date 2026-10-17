-- Hand-edited: the foreign key from character_id to characters (restrict: characters are archived, never deleted) and
-- the one from approved_by to users (set null: a campaign keeps its approvals when the GM who gave them is deleted), as
-- campaign.table.ts may not import the character or identity contexts' tables; archive.protect (ADR-0062), as a
-- revoked approval is archived, never deleted; and audit.enable, as every public table is audited.
CREATE TABLE "campaign_item_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"rule" text NOT NULL,
	"rune" uuid NOT NULL,
	"value" smallint NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "campaign_item_approvals" ADD CONSTRAINT "campaign_item_approvals_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_item_approvals_live_idx" ON "campaign_item_approvals" USING btree ("campaign_id","character_id","item_id","rule","rune") WHERE "campaign_item_approvals"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "campaign_item_approvals_character_idx" ON "campaign_item_approvals" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "campaign_item_approvals_approved_by_idx" ON "campaign_item_approvals" USING btree ("approved_by");
--> statement-breakpoint
ALTER TABLE "campaign_item_approvals" ADD CONSTRAINT "campaign_item_approvals_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_item_approvals" ADD CONSTRAINT "campaign_item_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('campaign_item_approvals');--> statement-breakpoint
SELECT audit.enable('campaign_item_approvals');
