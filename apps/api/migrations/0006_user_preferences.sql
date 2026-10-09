-- Hand-edited: audit.enable added, as every public table is audited (see 0002).
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ui_locale" text,
	"content_locale" text,
	"distance_unit" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('user_preferences');
