import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterLevel, CharacterName, CharacterPatchField, CharacterSort } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { FIRST_VERSION, fixedClock, SortDirection, Version, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const later = fixedClock('2026-10-07T10:00:00Z').now();

describe.skipIf(adminUrl === undefined)('DrizzleCharacterRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let repository: DrizzleCharacterRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCharacterRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('insert, find, list, update round-trip', async () => {
    const valeros = new CharacterBuilder().named('Valeros').build();
    await repository.insert(valeros);
    await repository.insert(new CharacterBuilder().named('Kyra').build());
    const found = await repository.findById(valeros.id);
    expect(found?.name).toBe(CharacterName.parse('Valeros'));
    const byName = await repository.list({ sort: CharacterSort.Name, direction: SortDirection.Asc });
    expect(byName.map((character) => character.name)).toStrictEqual([
      CharacterName.parse('Kyra'),
      CharacterName.parse('Valeros'),
    ]);
    const updated = await repository.update(
      valeros.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) }, later),
      FIRST_VERSION,
    );
    expect(updated.version).toBe(Version.parse(2));
    expect(await rejection(repository.update(updated, FIRST_VERSION))).toBeInstanceOf(VersionConflictError);
  });

  test('every query the repository issued is served by an index', async () => {
    // Exercise every sort option in both directions so each one is planned.
    const options = Object.values(CharacterSort).flatMap((sort) =>
      Object.values(SortDirection).map((direction) => ({ sort, direction })),
    );
    await Promise.all(options.map(async (query) => repository.list(query)));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
