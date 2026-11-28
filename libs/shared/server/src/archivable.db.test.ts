import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { newId, Temporal, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { and, eq, sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { archiveRows, restoreRows } from './archivable';
import { stampAudit } from './audit-stamp';
import { createTestDatabase, testDatabaseUrl } from './testing';
import type { TestDatabase } from './testing';
import { updateVersioned } from './versioned-update';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = Temporal.Instant.from('2026-11-26T08:00:00Z');
const AUDIT = { actor: UserId.parse(newId()), command: 'test-archive' };

/** A guard step that counts how often it ran. */
class CountingGuard {
  public count = 0;

  public readonly run = async (): Promise<void> => {
    this.count += 1;
  };
}

/** The steps of a guard, recording the order they ran in. */
class OrderedGuard {
  public readonly steps: Array<string> = [];

  public readonly beforeLock = async (): Promise<void> => {
    this.steps.push('beforeLock');
  };

  public readonly whileLocked = async (): Promise<void> => {
    this.steps.push('whileLocked');
  };
}

interface ArchiveGuardSteps {
  readonly beforeLock?: () => Promise<void>;
  readonly whileLocked?: () => Promise<void>;
}

async function refuse(): Promise<void> {
  throw new Error('refused');
}

const things = pgTable('archivable_things', {
  id: uuid().primaryKey(),
  name: text().notNull(),
  version: integer().notNull(),
  archivedAt: timestamp({ withTimezone: true, mode: 'string' }),
});

describe.skipIf(adminUrl === undefined)('archive, restore and versioned update (postgres)', () => {
  let database: TestDatabase;

  async function seed(): Promise<string> {
    const id = newId();
    await database.db.insert(things).values({ id, name: 'one', version: 1 });

    return id;
  }

  async function read(id: string): Promise<typeof things.$inferSelect> {
    const [row] = await database.db.select().from(things).where(eq(things.id, id));

    if (row === undefined) {
      throw new Error(`No row ${id}`);
    }

    return row;
  }

  async function archive(id: string, at: Temporal.Instant): Promise<void> {
    await database.db.transaction(async (tx) => {
      await stampAudit(tx, AUDIT);
      await archiveRows(tx, things, { where: eq(things.id, id), now: at });
    });
  }

  async function archiveGuarded(id: string, whileLocked: () => Promise<void>): Promise<void> {
    await database.db.transaction(async (tx) => {
      await stampAudit(tx, AUDIT);
      await archiveRows(tx, things, { where: eq(things.id, id), now: NOW, guard: { whileLocked } });
    });
  }

  async function restoreGuarded(id: string, guard: ArchiveGuardSteps): Promise<void> {
    await database.db.transaction(async (tx) => {
      await stampAudit(tx, AUDIT);
      await restoreRows(tx, things, { where: eq(things.id, id), guard });
    });
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await database.db.execute(
      sql`create table archivable_things (id uuid primary key, name text not null, version integer not null, archived_at timestamptz)`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('archive stamps the row and keeps its version', async () => {
    const id = await seed();
    await archive(id, NOW);

    const row = await read(id);
    expect(row.archivedAt).not.toBeNull();
    expect(row.version).toBe(1);
  });

  test('archiving an archived row keeps the first stamp', async () => {
    const id = await seed();
    await archive(id, NOW);
    const first = await read(id);
    await archive(id, NOW.add({ hours: 1 }));
    const second = await read(id);

    expect(second.archivedAt).toBe(first.archivedAt);
  });

  test('restore clears the stamp', async () => {
    const id = await seed();
    await archive(id, NOW);
    await database.db.transaction(async (tx) => restoreRows(tx, things, { where: eq(things.id, id) }));
    const row = await read(id);

    expect(row.archivedAt).toBeNull();
  });

  test('restore leaves a live row alone', async () => {
    const id = await seed();
    await database.db.transaction(async (tx) => restoreRows(tx, things, { where: eq(things.id, id) }));
    const row = await read(id);

    expect(row.archivedAt).toBeNull();
  });

  test('a guard runs between the lock and the update, and only when a row matched', async () => {
    const id = await seed();
    const runs = new CountingGuard();

    await archiveGuarded(id, runs.run);
    await archiveGuarded(id, runs.run);

    expect(runs.count).toBe(1);
  });

  test('a guard takes its wider lock before the row lock, then checks', async () => {
    const id = await seed();
    const guard = new OrderedGuard();
    await database.db.transaction(async (tx) => {
      await archiveRows(tx, things, { where: eq(things.id, id), now: NOW, guard });
    });

    expect(guard.steps).toEqual(['beforeLock', 'whileLocked']);
  });

  test('a guarded restore checks only an archived row', async () => {
    const id = await seed();
    const guard = new OrderedGuard();
    await restoreGuarded(id, guard);
    await archive(id, NOW);
    await restoreGuarded(id, guard);
    const row = await read(id);

    expect(guard.steps).toEqual(['beforeLock', 'beforeLock', 'whileLocked']);
    expect(row.archivedAt).toBeNull();
  });

  test('a restore guard that throws leaves the row archived', async () => {
    const id = await seed();
    await archive(id, NOW);

    await rejection(restoreGuarded(id, { whileLocked: refuse }));
    const row = await read(id);

    expect(row.archivedAt).not.toBeNull();
  });

  test('a guard that throws leaves the row live', async () => {
    const id = await seed();

    await rejection(archiveGuarded(id, refuse));
    const row = await read(id);

    expect(row.archivedAt).toBeNull();
  });

  test('versioned update writes on the expected version and returns the row', async () => {
    const id = await seed();

    const row = await database.db.transaction(async (tx) =>
      updateVersioned(tx, things, {
        set: { name: 'two', version: 2 },
        where: and(eq(things.id, id), eq(things.version, 1)),
        resource: 'Thing',
        id,
      }),
    );

    expect(row).toMatchObject({ id, name: 'two', version: 2 });
  });

  test('versioned update on a stale version throws a conflict and changes nothing', async () => {
    const id = await seed();

    const error = await rejection(
      database.db.transaction(async (tx) =>
        updateVersioned(tx, things, {
          set: { name: 'two', version: 3 },
          where: and(eq(things.id, id), eq(things.version, 2)),
          resource: 'Thing',
          id,
        }),
      ),
    );

    const row = await read(id);

    expect(error).toBeInstanceOf(VersionConflictError);
    expect(row.name).toBe('one');
  });
});
