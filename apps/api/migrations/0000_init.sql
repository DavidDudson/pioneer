CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"ancestry" uuid NOT NULL,
	"level" smallint NOT NULL,
	"attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit"."log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"row_id" uuid NOT NULL,
	"action" text NOT NULL,
	"row_version" integer,
	"actor_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"before" jsonb,
	"after" jsonb
);
--> statement-breakpoint
CREATE INDEX "characters_created_at_id_idx" ON "characters" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "characters_name_id_idx" ON "characters" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "log_row_idx" ON "audit"."log" USING btree ("table_name","row_id","changed_at");