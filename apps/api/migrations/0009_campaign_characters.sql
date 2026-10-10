-- Hand-edited: foreign key from character_id to characters (campaign.table.ts may not import the character
-- context's tables; deleting a character takes it out of its campaign), and audit.enable, as every public
-- table is audited.
CREATE TABLE "campaign_characters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"attached_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_member_id_campaign_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."campaign_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_characters_character_idx" ON "campaign_characters" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "campaign_characters_campaign_attached_at_idx" ON "campaign_characters" USING btree ("campaign_id","attached_at","id");--> statement-breakpoint
CREATE INDEX "campaign_characters_member_idx" ON "campaign_characters" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "campaign_characters" ADD CONSTRAINT "campaign_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('campaign_characters');
