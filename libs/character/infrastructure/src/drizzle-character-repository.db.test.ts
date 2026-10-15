import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterDocumentSchema,
  CharacterLevel,
  CharacterName,
  CharacterPatchField,
  CharacterSort,
  CorruptCharacterDocumentError,
  CURRENT_SCHEMA_VERSION,
  StoredCharacterDocument,
} from '@pioneer/character/domain';
import type { Character, CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder, fixtureOwnerId, humanAncestryId, PAST_DOCUMENTS } from '@pioneer/character/domain/testing';
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
import {
  createTestDatabase,
  createTestDatabaseBefore,
  QueryRecorder,
  testDatabaseUrl,
  unindexedQueries,
} from '@pioneer/shared/server/testing';
import type { PartlyMigratedDatabase, TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';
import * as z from 'zod';

import { characters } from './character.table';
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
const renaming = { actor: fixtureOwnerId, command: CharacterCommand.RenameCharacter } as const;

/** The columns a save keeps in step with the document, as stored. */
const StoredRow = z.object({
  name: z.string(),
  level: z.number(),
  ownerId: z.string(),
  schemaVersion: z.number(),
  document: z.unknown(),
});
type StoredRow = z.infer<typeof StoredRow>;

/** A document as the `characters` row stores it: encoded, without the play state that lives in `character_play`. */
function storedForm(document: Character['document']): object {
  const { play: _apart, ...stored } = z.encode(CharacterDocumentSchema, document);
  return stored;
}

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

  /** The character `id`, which the test has just written. */
  async function stored(id: CharacterId): Promise<Character> {
    const found = await repository.findById(id);
    if (found === undefined) {
      throw new Error(`Character ${id} was not found`);
    }
    return found;
  }

  async function storedRow(id: CharacterId): Promise<StoredRow> {
    const [row] = await database.db
      .select({
        name: characters.name,
        level: characters.level,
        ownerId: characters.ownerId,
        schemaVersion: characters.schemaVersion,
        document: characters.document,
      })
      .from(characters)
      .where(eq(characters.id, id));
    return StoredRow.parse(row);
  }

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

  test('stores the document with its list columns copied from it, at the current schema version', async () => {
    const amiri = new CharacterBuilder().named('Amiri').atLevel(3).build();
    await repository.insert(amiri, created);
    const renamed = await repository.update(
      amiri.apply({ field: CharacterPatchField.Name, value: CharacterName.parse('Amiri the Bold') }, later),
      FIRST_VERSION,
      renaming,
    );
    const row = await storedRow(renamed.id);
    expect(row).toStrictEqual({
      name: 'Amiri the Bold',
      level: 3,
      ownerId: fixtureOwnerId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      document: storedForm(renamed.document),
    });
    const found = await repository.findById(renamed.id);
    expect(found?.document).toStrictEqual(renamed.document);
    expect(found?.ancestry).toBe(humanAncestryId);
  });

  test('a row written before every part had a value loads with defaults and is saved whole', async () => {
    const lini = new CharacterBuilder().named('Lini').build();
    await repository.insert(lini, created);
    const sparse = { schemaVersion: 1, id: lini.id, ownerId: lini.ownerId, name: lini.name, level: lini.level };
    await database.db.execute(
      sql`update characters set document = ${JSON.stringify(sparse)}::jsonb where id = ${lini.id}`,
    );
    const loaded = await stored(lini.id);
    expect(loaded.document.build).toStrictEqual({ choices: {}, spellAccess: [], repertoireSwaps: [], boons: [] });
    await repository.update(
      loaded.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(2) }, later),
      FIRST_VERSION,
      levelled,
    );
    const row = await storedRow(lini.id);
    expect(row.document).toStrictEqual(storedForm({ ...loaded.document, level: CharacterLevel.parse(2) }));
  });

  test.each([...PAST_DOCUMENTS])(
    'a version %p row loads upgraded and is saved at the current version',
    async (version, pastDocument) => {
      const past = new CharacterBuilder().named(`Past ${version}`).build();
      await repository.insert(past, created);
      const document = { ...StoredCharacterDocument.parse(pastDocument), id: past.id, ownerId: past.ownerId };
      await database.db.execute(
        sql`update characters set schema_version = ${version}, document = ${JSON.stringify(document)}::jsonb where id = ${past.id}`,
      );
      const loaded = await stored(past.id);
      expect(loaded.document.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      await repository.update(loaded, FIRST_VERSION, levelled);
      const row = await storedRow(past.id);
      expect(row.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(row.document).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION });
    },
  );

  test('a stored document that is not a valid one is a server fault, not a request one', async () => {
    // Its own owner, so no other test lists it.
    const harskOwnerId = UserId.parse(newId());
    await insertUser(database, harskOwnerId);
    const harsk = new CharacterBuilder().named('Harsk').ownedBy(harskOwnerId).build();
    await repository.insert(harsk, created);
    const corrupt = { schemaVersion: 1, id: harsk.id, ownerId: harsk.ownerId, name: harsk.name, level: 0 };
    await database.db.execute(
      sql`update characters set document = ${JSON.stringify(corrupt)}::jsonb where id = ${harsk.id}`,
    );
    expect(await rejection(repository.findById(harsk.id))).toBeInstanceOf(CorruptCharacterDocumentError);
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

describe.skipIf(adminUrl === undefined)('0012_character_document backfill (postgres)', () => {
  let database: PartlyMigratedDatabase;
  const ezren = new CharacterBuilder().named('Ezren').atLevel(5).build();
  const storedModifiers = { str: 0, dex: 1, con: 1, int: 4, wis: 2, cha: 0 };

  beforeAll(async () => {
    database = await createTestDatabaseBefore(adminUrl ?? '', '0012_character_document');
    await insertUser(database, fixtureOwnerId);
    const at = later.toString();
    await database.db.execute(
      sql`insert into characters (id, version, owner_id, name, ancestry, level, attributes, created_at, updated_at) values (${ezren.id}, 4, ${fixtureOwnerId}, 'Ezren', ${humanAncestryId}, 5, ${JSON.stringify(storedModifiers)}::jsonb, ${at}, ${at})`,
    );
    await database.migrateRest();
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an existing character keeps its ancestry as the ancestry slot’s selection', async () => {
    const found = await new DrizzleCharacterRepository(database.db).findById(ezren.id);
    expect(found?.ancestry).toBe(humanAncestryId);
    expect(found?.name).toBe(CharacterName.parse('Ezren'));
    expect(found?.level).toBe(CharacterLevel.parse(5));
    expect(found?.version).toBe(Version.parse(4));
    expect(found?.document.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('stored modifiers never enter the document, and their column is gone', async () => {
    const rows = await database.db.execute(
      sql`select document ? 'attributes' as present, document->'build'->'choices' as choices from characters where id = ${ezren.id}`,
    );
    expect(rows[0]).toStrictEqual({ present: false, choices: { ancestry: humanAncestryId } });
    const columns = await database.db.execute(
      sql`select column_name from information_schema.columns where table_name = 'characters' and column_name = 'attributes'`,
    );
    expect(columns).toHaveLength(0);
  });
});
