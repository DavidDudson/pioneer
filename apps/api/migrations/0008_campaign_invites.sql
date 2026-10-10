-- Hand-edited: foreign key from created_by to users (campaign.table.ts may not import identity's tables;
-- deleting a user deletes the invites they made), and audit.enable, as every public table is audited.
CREATE TABLE "campaign_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "campaign_invites" ADD CONSTRAINT "campaign_invites_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_invites_token_hash_idx" ON "campaign_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "campaign_invites_campaign_created_at_idx" ON "campaign_invites" USING btree ("campaign_id","created_at","id");--> statement-breakpoint
CREATE INDEX "campaign_invites_created_by_idx" ON "campaign_invites" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "campaign_invites" ADD CONSTRAINT "campaign_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('campaign_invites');
