import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterPatchField } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { fixedClock, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';

import { DrizzleCharacterRepository } from './drizzle-character-repository';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = Bun.env['TEST_DATABASE_URL'];
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
    expect(found?.name).toBe('Valeros');
    expect(await repository.list()).toHaveLength(2);
    const updated = await repository.update(valeros.apply({ field: CharacterPatchField.Level, value: 2 }, later), 1);
    expect(updated.version).toBe(2);
    expect(await rejection(repository.update(updated, 1))).toBeInstanceOf(VersionConflictError);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
