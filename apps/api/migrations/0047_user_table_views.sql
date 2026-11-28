CREATE TABLE "user_table_views" (
	"user_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"preferences" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_table_views_user_id_entity_pk" PRIMARY KEY("user_id","entity")
);
--> statement-breakpoint
ALTER TABLE "user_table_views" ADD CONSTRAINT "user_table_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;