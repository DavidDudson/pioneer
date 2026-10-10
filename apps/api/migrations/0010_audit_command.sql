-- Hand-edited: audit.capture() also reads pioneer.command, set local by stampAudit() beside
-- pioneer.actor_id, so each row names the command that wrote it. Null for writes outside a command.
ALTER TABLE "audit"."log" ADD COLUMN "command" text;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION audit.capture() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, audit
AS $$
DECLARE
  changed jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
BEGIN
  INSERT INTO audit.log (table_name, row_id, action, row_version, actor_id, command, before, after)
  VALUES (
    TG_TABLE_NAME,
    (changed ->> 'id')::uuid,
    lower(TG_OP),
    (changed ->> 'version')::integer,
    nullif(current_setting('pioneer.actor_id', true), '')::uuid,
    nullif(current_setting('pioneer.command', true), ''),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;
