-- Hand-edited: the foreign key from set_by to users (set null: a campaign keeps its limits when the GM who set them is
-- deleted), as campaign.table.ts may not import the identity context's tables; and audit.enable, as every public table is
-- audited.
CREATE TABLE "campaign_rule_limits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"limit" text NOT NULL,
	"value" smallint NOT NULL,
	"set_by" uuid,
	"set_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_rule_limits" ADD CONSTRAINT "campaign_rule_limits_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_rule_limits_campaign_limit_idx" ON "campaign_rule_limits" USING btree ("campaign_id","limit");--> statement-breakpoint
CREATE INDEX "campaign_rule_limits_set_by_idx" ON "campaign_rule_limits" USING btree ("set_by");--> statement-breakpoint
ALTER TABLE "campaign_rule_limits" ADD CONSTRAINT "campaign_rule_limits_set_by_users_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('campaign_rule_limits');
