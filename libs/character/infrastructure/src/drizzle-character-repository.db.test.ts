import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterLevel,
  CharacterName,
  CharacterPatchField,
  CharacterSort,
} from '@pioneer/character/domain';
import { CharacterBuilder, fixtureOwnerId } from '@pioneer/character/domain/testing';
import {
  FIRST_VERSION,
  fixedClock,
  newId,
  SortDirection,
  UserId,
  Version,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const later = fixedClock('2026-10-07T10:00:00Z').now();
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;
const created = { actor: fixtureOwnerId, command: CharacterCommand.CreateCharacter } as const;
const levelled = { actor: fixtureOwnerId, command: CharacterCommand.SetLevel } as const;

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const at = later.toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${at}, ${at})`,
  );
}

describe.skipIf(adminUrl === undefined)('DrizzleCharacterRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  const otherOwnerId = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCharacterRepository(database.db);
    await insertUser(database, fixtureOwnerId);
    await insertUser(database, otherOwnerId);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('insert, find, list, update round-trip', async () => {
    const valeros = new CharacterBuilder().named('Valeros').build();
    await repository.insert(valeros, created);
    await repository.insert(new CharacterBuilder().named('Kyra').build(), created);
    const found = await repository.findById(valeros.id);
    expect(found?.name).toBe(CharacterName.parse('Valeros'));
    expect(found?.ownerId).toBe(fixtureOwnerId);
    const listed = await repository.listForOwner(fixtureOwnerId, byName);
    expect(listed.map((character) => character.name)).toStrictEqual([
      CharacterName.parse('Kyra'),
      CharacterName.parse('Valeros'),
    ]);
    const updated = await repository.update(
      valeros.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) }, later),
      FIRST_VERSION,
      levelled,
    );
    expect(updated.version).toBe(Version.parse(2));
    expect(await rejection(repository.update(updated, FIRST_VERSION, levelled))).toBeInstanceOf(VersionConflictError);
  });

  test('a list holds only its owner’s characters', async () => {
    const seelah = new CharacterBuilder().named('Seelah').ownedBy(otherOwnerId).build();
    await repository.insert(seelah, created);
    const theirs = await repository.listForOwner(otherOwnerId, byName);
    expect(theirs.map((character) => character.id)).toStrictEqual([seelah.id]);
    const mine = await repository.listForOwner(fixtureOwnerId, byName);
    expect(mine.map((character) => character.id)).not.toContain(seelah.id);
  });

  test('an owner must be an existing user', async () => {
    const orphan = new CharacterBuilder().named('Orphan').ownedBy(UserId.parse(newId())).build();
    const error = await rejection(repository.insert(orphan, created));
    // Drizzle wraps the driver's error; the violated constraint is on the cause.
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).cause)).toContain('characters_owner_id_users_id_fk');
  });

  test('deleting a user deletes their characters', async () => {
    const goneId = UserId.parse(newId());
    await insertUser(database, goneId);
    const lem = new CharacterBuilder().named('Lem').ownedBy(goneId).build();
    await repository.insert(lem, created);
    await database.db.execute(sql`delete from users where id = ${goneId}`);
    expect(await repository.findById(lem.id)).toBeUndefined();
  });

  test('every query the repository issued is served by an index', async () => {
    // Exercise every sort option in both directions so each one is planned.
    const options = Object.values(CharacterSort).flatMap((sort) =>
      Object.values(SortDirection).map((direction) => ({ sort, direction })),
    );
    await Promise.all(options.map(async (query) => repository.listForOwner(fixtureOwnerId, query)));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
