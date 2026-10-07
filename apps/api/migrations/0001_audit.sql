-- Audit trail: every insert/update/delete on an audited table lands in
-- audit.log via a trigger, so nothing (app code, manual SQL, migrations)
-- can change data without a record. The log itself is append-only.

CREATE FUNCTION audit.capture() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, audit
AS $$
DECLARE
  changed jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
BEGIN
  INSERT INTO audit.log (table_name, row_id, action, row_version, actor_id, before, after)
  VALUES (
    TG_TABLE_NAME,
    (changed ->> 'id')::uuid,
    lower(TG_OP),
    (changed ->> 'version')::integer,
    nullif(current_setting('pioneer.actor_id', true), '')::uuid,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint

-- Call from the migration that creates a table: SELECT audit.enable('things');
CREATE FUNCTION audit.enable(target regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER audit_capture AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit.capture()',
    target
  );
END;
$$;
--> statement-breakpoint

CREATE FUNCTION audit.forbid_change() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit.log is append-only (% rejected)', TG_OP;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER log_append_only BEFORE UPDATE OR DELETE ON audit.log
  FOR EACH ROW EXECUTE FUNCTION audit.forbid_change();
--> statement-breakpoint

CREATE TRIGGER log_no_truncate BEFORE TRUNCATE ON audit.log
  FOR EACH STATEMENT EXECUTE FUNCTION audit.forbid_change();
--> statement-breakpoint

SELECT audit.enable('characters');
