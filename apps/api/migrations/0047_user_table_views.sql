-- Hand-edited: audit.enable added, as every public table is audited (see 0002).
CREATE TABLE "user_table_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"preferences" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_table_views" ADD CONSTRAINT "user_table_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_table_views_user_entity_idx" ON "user_table_views" USING btree ("user_id","entity");--> statement-breakpoint
SELECT audit.enable('user_table_views');
