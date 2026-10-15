import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterSort } from '@pioneer/character/domain';
import { CharacterBuilder, fixtureOwnerId } from '@pioneer/character/domain/testing';
import { fixedClock, newId, SortDirection, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { characters } from './character.table';
import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** Archived characters (ADR-0062). Runs against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-15T08:00:00Z').now();
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;
const created = { actor: fixtureOwnerId, command: CharacterCommand.CreateCharacter } as const;
const archiving = { actor: fixtureOwnerId, command: CharacterCommand.ArchiveCharacter } as const;
const restoring = { actor: fixtureOwnerId, command: CharacterCommand.RestoreCharacter } as const;

describe.skipIf(adminUrl === undefined)('archived characters (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let repository: DrizzleCharacterRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCharacterRepository(database.db);
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an archived character is missing from reads and lists, and found as archived', async () => {
    const kyra = new CharacterBuilder().named('Kyra').build();
    await repository.insert(kyra, created);
    await repository.archive(kyra.id, NOW, archiving);
    expect(await repository.findById(kyra.id)).toBeUndefined();
    const live = await repository.listForOwner(fixtureOwnerId, byName);
    expect(live.map((character) => character.id)).not.toContain(kyra.id);
    const archived = await repository.listArchivedForOwner(fixtureOwnerId, byName);
    expect(archived.map((character) => character.id)).toContain(kyra.id);
    const found = await repository.findArchivedById(kyra.id);
    expect(found?.version).toBe(kyra.version);
  });

  test('restoring brings it back with its version, document and play state untouched', async () => {
    const seelah = new CharacterBuilder().named('Seelah').build();
    await repository.insert(seelah, created);
    await repository.archive(seelah.id, NOW, archiving);
    await repository.archive(seelah.id, NOW, archiving);
    await repository.restore(seelah.id, restoring);
    expect(await repository.findArchivedById(seelah.id)).toBeUndefined();
    const back = await repository.findById(seelah.id);
    expect(back?.version).toBe(seelah.version);
    expect(back?.document).toStrictEqual(seelah.document);
  });

  test('a build save leaves the archived mark alone', async () => {
    const lem = new CharacterBuilder().named('Lem').build();
    await repository.insert(lem, created);
    await repository.archive(lem.id, NOW, archiving);
    const [row] = await database.db
      .select({ archivedAt: characters.archivedAt })
      .from(characters)
      .where(eq(characters.id, lem.id));
    expect(row?.archivedAt).not.toBeNull();
  });

  test('archive and restore are audited by name', async () => {
    const harsk = new CharacterBuilder().named('Harsk').build();
    await repository.insert(harsk, created);
    await repository.archive(harsk.id, NOW, archiving);
    await repository.restore(harsk.id, restoring);
    const rows = await database.db.execute(
      sql`select command from audit.log where table_name = 'characters' and row_id = ${harsk.id} and action = 'update' order by changed_at`,
    );
    expect(rows.map((row) => String(row['command']))).toStrictEqual([
      CharacterCommand.ArchiveCharacter,
      CharacterCommand.RestoreCharacter,
    ]);
  });

  test('a character row cannot be deleted', async () => {
    const valeros = new CharacterBuilder().named('Valeros').build();
    await repository.insert(valeros, created);
    const refused = await rejection(database.db.execute(sql`delete from characters where id = ${valeros.id}`));
    expect(refused).toBeInstanceOf(Error);
    expect(await repository.findById(valeros.id)).toBeDefined();
  });

  test('a user with characters cannot be deleted', async () => {
    const owner = UserId.parse(newId());
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${owner}, 'Gone', false, ${at}, ${at})`,
    );
    await repository.insert(new CharacterBuilder().named('Merisiel').ownedBy(owner).build(), created);
    const refused = await rejection(database.db.execute(sql`delete from users where id = ${owner}`));
    expect(refused).toBeInstanceOf(Error);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
