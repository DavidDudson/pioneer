import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  CHARACTER_PAGE_SIZE,
  CharacterCommand,
  CharacterFacetQuery,
  CharacterFilter,
  CharacterPageQuery,
  CharacterPatchField,
  CharacterSearch,
  CLASS_SLOT,
  filterConditionsOf,
} from '@pioneer/character/domain';
import type { Character, CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder, fixtureOwnerId } from '@pioneer/character/domain/testing';
import type { JsonObject } from '@pioneer/character/domain/testing';
import { AncestryId, ContentId } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { FilterCondition } from '@pioneer/shared/kernel';
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

  async function namesFor(query: CharacterPageQuery): Promise<ReadonlyArray<string>> {
    const page = await repository.pageForOwner(pageOwnerId, query);

    return page.items.map((character) => character.name);
  }

  async function run(conditions: ReadonlyArray<FilterCondition>): Promise<ReadonlyArray<string>> {
    return namesFor(CharacterPageQuery.parse({ sort: 'name', filters: JSON.stringify(conditions) }));
  }

  async function namesOf(query: JsonObject): Promise<ReadonlyArray<string>> {
    const filters = JSON.stringify(filterConditionsOf(CharacterFilter.parse(query)));

    return namesFor(CharacterPageQuery.parse({ sort: 'name', filters }));
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

  test('is not keeps the characters with no value, and any of takes several', async () => {
    expect(await run([{ property: 'class', operator: 'isNot', values: [fighterId] }])).toStrictEqual([
      'Page 100%',
      'Page Bring',
    ]);

    expect(await run([{ property: 'class', operator: 'isAnyOf', values: [fighterId, wizardId] }])).toStrictEqual([
      'Page Aldric',
      'Page Bring',
      'Page Cass',
    ]);

    expect(await run([{ property: 'level', operator: 'gt', values: ['5'] }])).toStrictEqual(['Page 100%', 'Page Cass']);
  });

  async function facets(query: Readonly<Record<string, string>>): Promise<ReadonlyArray<string>> {
    const page = await repository.facetsForOwner(pageOwnerId, CharacterFacetQuery.parse(query));

    return page.items.map(({ value, count }) => `${value}:${count}`);
  }

  test('facet counts list each class with how many picked it, most common first', async () => {
    expect(await facets({ property: 'class' })).toStrictEqual([`${fighterId}:2`, `${wizardId}:1`]);
  });

  test('facet counts leave out the property’s own conditions but keep the others', async () => {
    const own = JSON.stringify([{ property: 'class', operator: 'is', values: [wizardId] }]);
    expect(await facets({ property: 'class', filters: own })).toStrictEqual([`${fighterId}:2`, `${wizardId}:1`]);

    const others = JSON.stringify([{ property: 'level', operator: 'gte', values: ['9'] }]);
    expect(await facets({ property: 'class', filters: others })).toStrictEqual([`${fighterId}:1`]);
  });

  test('facet search matches a value in any case, its wildcards literal, and pages report the total', async () => {
    expect(await facets({ property: 'level', search: '9' })).toStrictEqual(['9:2']);
    expect(await facets({ property: 'level', search: '%' })).toStrictEqual([]);

    const page = await repository.facetsForOwner(pageOwnerId, CharacterFacetQuery.parse({ property: 'level' }));
    expect(page).toMatchObject({ total: 3, page: 1 });

    const past = await repository.facetsForOwner(
      pageOwnerId,
      CharacterFacetQuery.parse({ property: 'level', page: 2 }),
    );

    expect(past).toMatchObject({ items: [], total: 3, page: 2 });
  });

  test('facet counts see only the owner’s live characters', async () => {
    const other = await repository.facetsForOwner(otherOwnerId, CharacterFacetQuery.parse({ property: 'class' }));
    expect(other).toMatchObject({ items: [], total: 0 });
  });

  test('facet values with the same count come in value order', async () => {
    expect(await facets({ property: 'level' })).toStrictEqual(['9:2', '1:1', '5:1']);
  });

  test('nobody else’s characters are counted', async () => {
    const filters = JSON.stringify(filterConditionsOf({ name: CharacterSearch.parse('Page') }));
    const page = await repository.pageForOwner(otherOwnerId, CharacterPageQuery.parse({ filters }));

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
    const filters = [{ classId: fighterId }, { ancestry: elfId }, { minLevel: 2 }, { name: 'a' }];
    await Promise.all(filters.map(async (filter) => namesOf(filter)));
    await Promise.all(['class', 'ancestry', 'level'].map(async (property) => facets({ property })));
    await repository.pageForOwner(pageOwnerId, CharacterPageQuery.parse({ page: 2 }));

    const problems = await unindexedQueries(database.db, recorder);

    // A facet orders its values by an aggregate, which has to sort.
    // It reads one owner's rows through the owner index, so the sort is bounded.
    // A facet that scanned the table would still fail here.
    const unexpected = problems.filter((problem) => !(problem.startsWith('Sort on') && problem.includes(' group by ')));
    expect(unexpected).toStrictEqual([]);
  });

  afterAll(async () => {
    await database.drop();
  });
});
