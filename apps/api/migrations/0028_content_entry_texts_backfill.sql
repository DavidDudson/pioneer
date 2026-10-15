-- Hand-edited: 0022 copied descriptions with "data" -> 'description', which is NULL when the driver stored `data` as a
-- JSON string, so it wrote no rows, and the seed skips a pack whose hash has not changed. The missing source-locale
-- descriptions are filled in through content_entry_description (0027), which reads both forms; a row that exists is left
-- alone. Then any text still stored as a JSON string is rewritten as the document it holds. The table is already
-- audited (see 0022).
INSERT INTO "content_entry_texts" ("id", "entry_id", "locale", "field", "text", "updated_at")
SELECT gen_random_uuid(), "id", 'en', 'description', content_entry_description("data"), "updated_at"
FROM "content_entries"
WHERE jsonb_typeof(content_entry_description("data")) = 'array'
	AND jsonb_array_length(content_entry_description("data")) > 0
ON CONFLICT ("entry_id", "locale", "field") DO NOTHING;--> statement-breakpoint
UPDATE "content_entry_texts"
SET "text" = ("text" #>> '{}')::jsonb
WHERE jsonb_typeof("text") = 'string';
