-- Archive, never delete (ADR-0062). User content is marked archived, not removed. The tables that hold it get
-- these triggers from the migration that adds their archived_at column: SELECT archive.protect('things');
CREATE SCHEMA archive;--> statement-breakpoint
CREATE FUNCTION archive.forbid_delete() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is archived, never deleted (% rejected)', TG_TABLE_NAME, TG_OP;
END;
$$;--> statement-breakpoint
CREATE FUNCTION archive.protect(target regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER archive_no_delete BEFORE DELETE ON %s FOR EACH ROW EXECUTE FUNCTION archive.forbid_delete()',
    target
  );
  EXECUTE format(
    'CREATE TRIGGER archive_no_truncate BEFORE TRUNCATE ON %s FOR EACH STATEMENT EXECUTE FUNCTION archive.forbid_delete()',
    target
  );
END;
$$;
