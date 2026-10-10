-- Hand-edited: foreign keys to users added (campaign.table.ts may not import identity's tables; deleting
-- a user deletes the campaigns they run and their memberships), and audit.enable, as every public table is
-- audited (see 0002).
CREATE TABLE "campaign_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"gm_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_members_campaign_user_idx" ON "campaign_members" USING btree ("campaign_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_members_one_gm_idx" ON "campaign_members" USING btree ("campaign_id") WHERE "campaign_members"."role" = 'gm';--> statement-breakpoint
CREATE INDEX "campaign_members_user_joined_at_campaign_idx" ON "campaign_members" USING btree ("user_id","joined_at","campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_gm_id_idx" ON "campaigns" USING btree ("gm_id");--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_gm_id_users_id_fk" FOREIGN KEY ("gm_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('campaigns');--> statement-breakpoint
SELECT audit.enable('campaign_members');
