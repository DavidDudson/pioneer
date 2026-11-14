import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  CHARACTER_PAGE_SIZE,
  CharacterCommand,
  CharacterPageQuery,
  CharacterPatchField,
  CharacterSearch,
  CLASS_SLOT,
} from '@pioneer/character/domain';
import type { Character, CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder, fixtureOwnerId } from '@pioneer/character/domain/testing';
import { AncestryId, ContentId } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
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
const created = { actor: fixtureOwnerId, command: CharacterCommand.CreateCharacter } as const;
const levelled = { actor: fixtureOwnerId, command: CharacterCommand.SetLevel } as const;

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const at = later.toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${at}, ${at})`,
  );
}

describe.skipIf(adminUrl === undefined)('a page of the character list (postgres)', () => {
  const recorder = new QueryRecorder();
  const otherOwnerId = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterRepository;

  const pageOwnerId = UserId.parse(newId());
  const fighterId = ContentId.parse(newId());
  const wizardId = ContentId.parse(newId());
  const elfId = AncestryId.parse(newId());
  const everything = CharacterPageQuery.parse({});

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCharacterRepository(database.db);
    await insertUser(database, fixtureOwnerId);
    await insertUser(database, otherOwnerId);
    await insertUser(database, pageOwnerId);
    const drafts = [
      new CharacterBuilder().named('Page Aldric').atLevel(1).picking('class', fighterId),
      new CharacterBuilder().named('Page Bring').atLevel(5).picking('class', wizardId).withAncestry(elfId),
      new CharacterBuilder().named('Page Cass').atLevel(9).picking('class', fighterId).withAncestry(elfId),
      new CharacterBuilder().named('Page 100%').atLevel(9),
    ];
    for (const draft of drafts) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the order they are made in is the order they are listed in
      await repository.insert(draft.ownedBy(pageOwnerId).build(), created);
    }
  });

  /** The character `id`, which a test has just written. */
  async function stored(id: CharacterId): Promise<Character> {
    const found = await repository.findById(id);
    if (found === undefined) {
      throw new Error(`Character ${id} was not written`);
    }
    return found;
  }

  async function namesOf(query: Record<string, unknown>): Promise<readonly string[]> {
    const page = await repository.pageForOwner(pageOwnerId, CharacterPageQuery.parse({ sort: 'name', ...query }));
    return page.items.map((character) => character.name);
  }

  test('holds a page of the owner’s characters and counts every one', async () => {
    const page = await repository.pageForOwner(pageOwnerId, everything);
    expect(page.items).toHaveLength(4);
    expect(page).toMatchObject({ total: 4, page: 1, pageSize: CHARACTER_PAGE_SIZE });
  });

  test('a page past the last is empty, and still says how many there are', async () => {
    const page = await repository.pageForOwner(pageOwnerId, CharacterPageQuery.parse({ page: 2 }));
    expect(page.items).toStrictEqual([]);
    expect(Number(page.total)).toBe(4);
  });

  test('a level range keeps the characters within it, either end open', async () => {
    expect(await namesOf({ minLevel: 5, maxLevel: 9 })).toStrictEqual(['Page 100%', 'Page Bring', 'Page Cass']);
    expect(await namesOf({ maxLevel: 1 })).toStrictEqual(['Page Aldric']);
    expect(await namesOf({ minLevel: 9 })).toStrictEqual(['Page 100%', 'Page Cass']);
  });

  test('class and ancestry keep the characters that picked them', async () => {
    expect(await namesOf({ classId: fighterId })).toStrictEqual(['Page Aldric', 'Page Cass']);
    expect(await namesOf({ ancestry: elfId })).toStrictEqual(['Page Bring', 'Page Cass']);
  });

  test('filters combine with AND', async () => {
    expect(await namesOf({ classId: fighterId, ancestry: elfId, minLevel: 5 })).toStrictEqual(['Page Cass']);
    expect(await namesOf({ classId: wizardId, maxLevel: 1 })).toStrictEqual([]);
  });

  test('the name matches any case, and its wildcards match themselves', async () => {
    expect(await namesOf({ name: 'cAsS' })).toStrictEqual(['Page Cass']);
    expect(await namesOf({ name: CharacterSearch.parse('%') })).toStrictEqual(['Page 100%']);
    expect(await namesOf({ name: CharacterSearch.parse('_') })).toStrictEqual([]);
  });

  test('nobody else’s characters are counted', async () => {
    const page = await repository.pageForOwner(otherOwnerId, CharacterPageQuery.parse({ name: 'Page' }));
    expect(Number(page.total)).toBe(0);
  });

  test('a character that picks another class is listed under it from then on', async () => {
    const bring = await stored(new CharacterBuilder().named('Page Bring').build().id);
    const bard = ContentId.parse(newId());
    const changed = bring.apply({ field: CharacterPatchField.SelectSlot, slot: CLASS_SLOT, selection: bard }, later);
    await repository.update(changed, bring.version, levelled);
    expect(await namesOf({ classId: bard })).toStrictEqual(['Page Bring']);
    expect(await namesOf({ classId: wizardId })).toStrictEqual([]);
  });

  test('every filter and page is served by an index', async () => {
    const filters = [{ classId: fighterId }, { ancestry: elfId }, { minLevel: 2 }, { name: 'a' }, { page: 2 }];
    await Promise.all(filters.map(async (filter) => namesOf(filter)));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  afterAll(async () => {
    await database.drop();
  });
});
