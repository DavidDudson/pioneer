-- Hand-edited: audit.enable added, as every public table is audited (see 0002).
CREATE TABLE "bug_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"route" text NOT NULL,
	"app_version" text NOT NULL,
	"locale" text NOT NULL,
	"user_agent" text NOT NULL,
	"description" text NOT NULL,
	"steps" text NOT NULL,
	"character_id" uuid,
	"status" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reporter_users_id_fk" FOREIGN KEY ("reporter") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bug_reports_reporter_created_idx" ON "bug_reports" USING btree ("reporter","created_at");--> statement-breakpoint
SELECT audit.enable('bug_reports');
