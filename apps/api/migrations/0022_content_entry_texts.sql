-- Hand-edited: the descriptions of the entries already stored are copied in (the seed skips a pack whose hash has not
-- changed, so it would never write them), before audit.enable so the copy is not logged row by row; and audit.enable,
-- as every public table is audited (see 0002).
CREATE TABLE "content_entry_texts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"field" text NOT NULL,
	"text" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_entry_texts" ADD CONSTRAINT "content_entry_texts_entry_id_content_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_entry_texts_entry_locale_field_idx" ON "content_entry_texts" USING btree ("entry_id","locale","field");--> statement-breakpoint
INSERT INTO "content_entry_texts" ("id", "entry_id", "locale", "field", "text", "updated_at")
SELECT gen_random_uuid(), "id", 'en', 'description', "data" -> 'description', "updated_at"
FROM "content_entries"
WHERE jsonb_array_length("data" -> 'description') > 0;--> statement-breakpoint
SELECT audit.enable('content_entry_texts');
