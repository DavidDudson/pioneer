-- Hand-edited: archive.protect (ADR-0062), as the stash is kept with its campaign, never deleted; and audit.enable, as every
-- public table is audited.
CREATE TABLE "campaign_party_stashes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document" jsonb NOT NULL,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_party_stashes" ADD CONSTRAINT "campaign_party_stashes_id_campaigns_id_fk" FOREIGN KEY ("id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT archive.protect('campaign_party_stashes');--> statement-breakpoint
SELECT audit.enable('campaign_party_stashes');
