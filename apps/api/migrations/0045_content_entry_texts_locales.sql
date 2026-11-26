-- Hand-edited: per-locale search vectors (content-model.md, "Search"). The text search configuration follows the
-- locale's language (any other language is read as `simple`); a translation written to content_entry_texts keeps the
-- entry's vector in that locale current, each field falling back to the entry's own; and an entry edited keeps the
-- vectors of its translated locales current too. The `en` vector stays the entries' own trigger's. No backfill: no
-- translation is stored yet.
CREATE INDEX "content_entry_texts_locale_idx" ON "content_entry_texts" USING btree ("locale");--> statement-breakpoint
CREATE OR REPLACE FUNCTION content_search_config(locale text) RETURNS regconfig
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
	SELECT CASE locale
		WHEN 'en' THEN 'english'::regconfig
		WHEN 'de' THEN 'german'::regconfig
		WHEN 'fr' THEN 'french'::regconfig
		WHEN 'es' THEN 'spanish'::regconfig
		WHEN 'it' THEN 'italian'::regconfig
		WHEN 'pt' THEN 'portuguese'::regconfig
		WHEN 'nl' THEN 'dutch'::regconfig
		WHEN 'ru' THEN 'russian'::regconfig
		WHEN 'sv' THEN 'swedish'::regconfig
		WHEN 'da' THEN 'danish'::regconfig
		WHEN 'fi' THEN 'finnish'::regconfig
		WHEN 'no' THEN 'norwegian'::regconfig
		WHEN 'hu' THEN 'hungarian'::regconfig
		WHEN 'tr' THEN 'turkish'::regconfig
		ELSE 'simple'::regconfig
	END
$$;--> statement-breakpoint
-- The driver stores a value as a JSON string (see content_entry_description), so a text is read back through the
-- string; a value that is not JSON text is taken as it is.
CREATE FUNCTION content_text_value(stored jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
AS $$
BEGIN
	IF jsonb_typeof(stored) = 'string' THEN
		RETURN (stored #>> '{}')::jsonb;
	END IF;
	RETURN stored;
EXCEPTION WHEN invalid_text_representation THEN
	RETURN stored;
END
$$;--> statement-breakpoint
-- An entry's vector in one locale: the locale's name and description, each the entry's own where it has no translation.
CREATE FUNCTION content_entry_locale_vector(entry uuid, locale text) RETURNS tsvector
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
	SELECT content_search_vector(
		coalesce(
			(SELECT content_text_value(t.text) #>> '{}' FROM content_entry_texts t
				WHERE t.entry_id = e.id AND t.locale = $2 AND t.field = 'name'),
			e.name
		),
		coalesce(
			(SELECT content_text_value(t.text) FROM content_entry_texts t
				WHERE t.entry_id = e.id AND t.locale = $2 AND t.field = 'description'),
			content_entry_description(e.data)
		),
		$2
	)
	FROM content_entries e
	WHERE e.id = $1
$$;--> statement-breakpoint
CREATE FUNCTION content_entry_texts_sync_search() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	target_entry uuid;
	target_locale text;
BEGIN
	IF TG_OP = 'DELETE' THEN
		target_entry := OLD.entry_id;
		target_locale := OLD.locale;
	ELSE
		target_entry := NEW.entry_id;
		target_locale := NEW.locale;
	END IF;
	IF target_locale = 'en' THEN
		RETURN NULL;
	END IF;
	IF EXISTS (SELECT 1 FROM content_entry_texts WHERE entry_id = target_entry AND locale = target_locale) THEN
		INSERT INTO content_entry_search (id, entry_id, locale, vector, updated_at)
		SELECT gen_random_uuid(), target_entry, target_locale, content_entry_locale_vector(target_entry, target_locale), now()
		WHERE EXISTS (SELECT 1 FROM content_entries WHERE id = target_entry)
		ON CONFLICT (entry_id, locale) DO UPDATE SET vector = EXCLUDED.vector, updated_at = EXCLUDED.updated_at;
	ELSE
		DELETE FROM content_entry_search WHERE entry_id = target_entry AND locale = target_locale;
	END IF;
	RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER content_entry_texts_sync_search
AFTER INSERT OR UPDATE OR DELETE ON content_entry_texts
FOR EACH ROW EXECUTE FUNCTION content_entry_texts_sync_search();--> statement-breakpoint
CREATE OR REPLACE FUNCTION content_entries_sync_search() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	INSERT INTO content_entry_search (id, entry_id, locale, vector, updated_at)
	VALUES (gen_random_uuid(), NEW.id, 'en', content_search_vector(NEW.name, content_entry_description(NEW.data), 'en'), NEW.updated_at)
	ON CONFLICT (entry_id, locale) DO UPDATE SET vector = EXCLUDED.vector, updated_at = EXCLUDED.updated_at;
	UPDATE content_entry_search
	SET vector = content_entry_locale_vector(NEW.id, locale), updated_at = NEW.updated_at
	WHERE entry_id = NEW.id AND locale <> 'en';
	RETURN NULL;
END
$$;
