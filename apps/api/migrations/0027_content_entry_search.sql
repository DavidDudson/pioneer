-- Hand-edited: the search functions (content_entry_description also reads an entry stored as a JSON string, as the
-- driver writes jsonb today); the vectors of the entries already stored, before audit.enable so the copy is not logged
-- row by row; a trigger that keeps an entry's source-locale vector current whoever writes the entry (the seed, a
-- homebrew import), as `data` holds its description; and audit.enable, as every public table is audited (see 0002).
CREATE FUNCTION content_rich_text_plain(rich jsonb) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
	SELECT coalesce(string_agg(word, ' '), '')
	FROM jsonb_array_elements_text(jsonb_path_query_array(rich, 'strict $.**.text ? (@.type() == "string")')) AS word
$$;--> statement-breakpoint
CREATE FUNCTION content_search_config(locale text) RETURNS regconfig
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
	SELECT CASE locale WHEN 'en' THEN 'english'::regconfig ELSE 'simple'::regconfig END
$$;--> statement-breakpoint
CREATE FUNCTION content_entry_description(entry jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
	SELECT CASE jsonb_typeof(entry) WHEN 'string' THEN (entry #>> '{}')::jsonb -> 'description' ELSE entry -> 'description' END
$$;--> statement-breakpoint
CREATE FUNCTION content_search_vector(entry_name text, description jsonb, locale text) RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
	SELECT setweight(to_tsvector(content_search_config(locale), entry_name), 'A')
		|| setweight(to_tsvector(content_search_config(locale), content_rich_text_plain(description)), 'B')
$$;--> statement-breakpoint
CREATE TABLE "content_entry_search" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"vector" "tsvector" NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_entry_search" ADD CONSTRAINT "content_entry_search_entry_id_content_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_entry_search_entry_locale_idx" ON "content_entry_search" USING btree ("entry_id","locale");--> statement-breakpoint
CREATE INDEX "content_entry_search_vector_idx" ON "content_entry_search" USING gin ("vector");--> statement-breakpoint
INSERT INTO "content_entry_search" ("id", "entry_id", "locale", "vector", "updated_at")
SELECT gen_random_uuid(), "id", 'en', content_search_vector("name", content_entry_description("data"), 'en'), "updated_at"
FROM "content_entries";--> statement-breakpoint
CREATE FUNCTION content_entries_sync_search() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	INSERT INTO content_entry_search (id, entry_id, locale, vector, updated_at)
	VALUES (gen_random_uuid(), NEW.id, 'en', content_search_vector(NEW.name, content_entry_description(NEW.data), 'en'), NEW.updated_at)
	ON CONFLICT (entry_id, locale) DO UPDATE SET vector = EXCLUDED.vector, updated_at = EXCLUDED.updated_at;
	RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER content_entries_sync_search
AFTER INSERT OR UPDATE OF name, data ON content_entries
FOR EACH ROW EXECUTE FUNCTION content_entries_sync_search();--> statement-breakpoint
SELECT audit.enable('content_entry_search');
