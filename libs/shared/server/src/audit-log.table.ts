import { index, integer, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const audit = pgSchema('audit');

/**
 * Append-only change history for every table, written by the
 * `audit.capture()` trigger (see apps/api/migrations/0001_audit.sql), never
 * by application code. Triggers catch every write, including manual SQL.
 * New tables must call `select audit.enable('<table>')` in their migration;
 * a DB test fails if any public table lacks the trigger.
 */
export const auditLog = audit.table(
  'log',
  {
    id: uuid().primaryKey().defaultRandom(),
    tableName: text().notNull(),
    rowId: uuid().notNull(),
    action: text({ enum: ['insert', 'update', 'delete'] }).notNull(),
    /** The row's optimistic-concurrency version after the change, if it has one. */
    rowVersion: integer(),
    /** From `set local pioneer.actor_id = '<uuid>'`; null for writes outside a command. */
    actorId: uuid(),
    /** From `set local pioneer.command = '<name>'`; null for writes outside a command (manual SQL, migrations). */
    command: text(),
    changedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    before: jsonb(),
    after: jsonb(),
  },
  (table) => [index('log_row_idx').on(table.tableName, table.rowId, table.changedAt)],
);
