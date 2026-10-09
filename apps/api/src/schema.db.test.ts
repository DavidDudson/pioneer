import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterLevel, CharacterPatchField } from '@pioneer/character/domain';
import { CharacterBuilder, fixtureOwnerId } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { FIRST_VERSION, fixedClock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

/** Schema-wide invariants. Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const TableRows = z.array(z.object({ table_name: z.string() }));
const ColumnRows = z.array(z.object({ column: z.string() }));
const adminUrl = testDatabaseUrl();

describe.skipIf(adminUrl === undefined)('database schema (postgres)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
  });

  afterAll(async () => {
    await database.drop();
  });

  test('every public table is audited', async () => {
    const unaudited = await database.db.execute<{ table_name: string }>(sql`
      select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'audit_capture')
    `);
    expect(TableRows.parse([...unaudited])).toStrictEqual([]);
  });

  test('every id column is a uuid', async () => {
    const nonUuid = await database.db.execute<{ column: string }>(sql`
      select table_schema || '.' || table_name || '.' || column_name as column
      from information_schema.columns
      where table_schema in ('public', 'audit')
        and (column_name = 'id' or column_name like '%\_id' or column_name = 'ancestry')
        and data_type <> 'uuid'
    `);
    expect(ColumnRows.parse([...nonUuid])).toStrictEqual([]);
  });

  test('writes are logged with before/after and version; the log is append-only', async () => {
    const at = fixedClock('2026-10-07T09:00:00Z').now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Amiri', false, ${at}, ${at})`,
    );
    const repository = new DrizzleCharacterRepository(database.db);
    const character = await repository.insert(new CharacterBuilder().named('Amiri').build());
    const patch = { field: CharacterPatchField.Level, value: CharacterLevel.parse(4) } as const;
    await repository.update(character.apply(patch, fixedClock('2026-10-07T10:00:00Z').now()), FIRST_VERSION);

    const entries = await database.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.rowId, character.id))
      .orderBy(asc(auditLog.changedAt));
    expect(entries.map((entry) => [entry.action, entry.rowVersion])).toStrictEqual([
      ['insert', 1],
      ['update', 2],
    ]);
    const [, update] = entries;
    expect(update?.before).toMatchObject({ level: 1 });
    expect(update?.after).toMatchObject({ level: 4 });

    expect(await rejection(database.db.execute(sql`delete from audit.log`))).toBeInstanceOf(Error);
    expect(await rejection(database.db.execute(sql`truncate audit.log`))).toBeInstanceOf(Error);
  });
});
