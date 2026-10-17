import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { contentPackId, ContentSearchQuery, ContentText } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';
import { fixedClock, UserId } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { ContentSearchRepository } from './content-search-repository';
import type { ContentSearchCriteria } from './content-search-repository';
import { seedContentPacks } from './content-seed';
import { contentEntries, contentEntrySearch, contentPacks } from './content.table';
import { creaturePack } from './testing/creature-packs';
import { languagePack, loader } from './testing/language-packs';
import type { Language } from './testing/language-packs';

/**
 * Content search against a throwaway Postgres database (see createTestDatabase), through the vectors the trigger on
 * `content_entries` keeps. Skipped when TEST_DATABASE_URL is unset; CI always sets it. Each test seeds its own pack, and
 * its words are its own, so tests share the database.
 *
 * The query plan guard (unindexedQueries) is not used: ranking sorts the matches, which no index serves, so the plan test
 * at the end checks that the words are matched through the GIN index instead. It checks the match predicate alone, as a
 * handful of rows leaves the planner free to start from the join.
 */
const adminUrl = testDatabaseUrl();
const firstSeed = fixedClock('2026-10-10T10:00:00Z');
const laterSeed = fixedClock('2026-10-11T10:00:00Z');
const owner = UserId.parse('8d3a2f40-6a7e-4b83-9f6b-8d0e1c3a5b71');
const at = '2026-10-10T10:00:00Z';

/** A search result as plain text and numbers, so a test compares it with what it expects. */
interface Found {
  readonly ids: readonly string[];
  readonly total: number;
}

function criteria(query: string, rest: Partial<ContentSearchCriteria> = {}): ContentSearchCriteria {
  const parsed = ContentSearchQuery.parse({ query });
  return { ...parsed, ...rest };
}

function language(slug: string, name: string, text?: string): Language {
  return text === undefined ? { slug, name } : { slug, name, text };
}

/** The ids of the pack's entries at `indexes`, in that order; the tests only ask for entries they wrote. */
function idsAt(contents: PackContents, ...indexes: readonly number[]): readonly string[] {
  return indexes.map((index) => {
    const entry = contents.entries[index];
    if (entry === undefined) {
      throw new Error(`Expected an entry at ${index}`);
    }
    return entry.id;
  });
}

describe.skipIf(adminUrl === undefined)('content search (postgres)', () => {
  let database: TestDatabase;
  let search: ContentSearchRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    search = new ContentSearchRepository(database.db);
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${owner}, 'Owner', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  async function seed(contents: PackContents, clock: Clock = firstSeed): Promise<void> {
    await seedContentPacks(database.db, [loader(contents)], clock);
  }

  async function ask(query: string, rest: Partial<ContentSearchCriteria> = {}): Promise<Found> {
    const { ids, total } = await search.search(criteria(query, rest));
    return { ids: ids.map(String), total: Number(total) };
  }

  async function ownedPack(slug: string): Promise<PackContents> {
    const pack = languagePack(slug, [language('secret', 'Moonlit secret', 'Whispered under the moon.')]);
    await seed(pack);
    await database.db
      .update(contentPacks)
      .set({ ownerId: owner, visibility: 'private' })
      .where(eq(contentPacks.id, contentPackId(pack.file.id)));
    return pack;
  }

  test('an entry matches on its name or on a stem of a word in its description', async () => {
    const pack = languagePack('search-ranking', [
      language('cinder', 'Cinder', 'A glowing emberstone of the old kilns.'),
      language('ember', 'Ember', 'A spark.'),
      language('ash', 'Ash', 'What a hearth leaves behind.'),
    ]);
    await seed(pack);

    const byName = await ask('ember');
    const byStem = await ask('emberstones');

    expect(byName).toStrictEqual({ ids: idsAt(pack, 1), total: 1 });
    expect(byStem).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
  });

  test('a name hit outranks a description hit', async () => {
    const pack = languagePack('search-weights', [
      language('lantern', 'Lantern', 'Lit by a single gleam in the dark.'),
      language('gleam', 'Gleam', 'A faint light.'),
    ]);
    await seed(pack);

    const result = await ask('gleam');

    expect(result).toStrictEqual({ ids: idsAt(pack, 1, 0), total: 2 });
  });

  test('the words are read as a search box is used, so odd input is never an error', async () => {
    const pack = languagePack('search-syntax', [
      language('quartz', 'Quartz', 'A clear crystal.'),
      language('onyx', 'Onyx', 'A dark crystal.'),
    ]);
    await seed(pack);

    const without = await ask('crystal -dark');
    const either = await ask('quartz or onyx');
    const broken = await ask('"quartz & | ( :*');

    expect(without.ids).toStrictEqual(idsAt(pack, 0));
    expect(either.total).toBe(2);
    expect(broken.ids).toStrictEqual(idsAt(pack, 0));
  });

  test('nothing matching is an empty page', async () => {
    const result = await ask('zzyzx');

    expect(result).toStrictEqual({ ids: [], total: 0 });
  });

  test('a creature is found by its name and by its description, for anyone', async () => {
    const pack = creaturePack('search-bestiary', 'Granarywyrm');
    await seed(pack);

    const byName = await ask('granarywyrm', { kinds: ['creature'] });
    const byText = await ask('granarywyrm gnaws');
    const otherKind = await ask('granarywyrm', { kinds: ['spell'] });

    expect(byName).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
    expect(byText).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
    expect(otherKind.total).toBe(0);
  });

  test('kinds narrow the search to those kinds', async () => {
    const pack = languagePack('search-kinds', [language('amber', 'Amberglass', 'Resin of ages.')]);
    await seed(pack);

    const languages = await ask('amberglass', { kinds: ['language'] });
    const spells = await ask('amberglass', { kinds: ['spell'] });

    expect(languages.ids).toStrictEqual(idsAt(pack, 0));
    expect(spells).toStrictEqual({ ids: [], total: 0 });
  });

  test('a page holds up to the limit from the offset, and the total counts every match', async () => {
    const pack = languagePack('search-paging', [
      language('first', 'Pagewise one'),
      language('second', 'Pagewise two'),
      language('third', 'Pagewise three'),
    ]);
    await seed(pack);
    const { limit, offset } = ContentSearchQuery.parse({ query: 'pagewise', limit: '1', offset: '1' });

    const everything = await ask('pagewise');
    const second = await ask('pagewise', { limit, offset });

    expect(everything.total).toBe(3);
    expect(second).toStrictEqual({ ids: everything.ids.slice(1, 2), total: 3 });
  });

  test('an edited entry is found by its new words and no longer by its old ones', async () => {
    await seed(languagePack('search-edited', [language('rune', 'Runic', 'Carved in basalt.')]));
    const edited = languagePack('search-edited', [language('rune', 'Runic', 'Carved in obsidian.')]);

    await seed(edited, laterSeed);

    const found = await ask('obsidian');
    const gone = await ask('basalt');
    expect(found.ids).toStrictEqual(idsAt(edited, 0));
    expect(gone.total).toBe(0);
  });

  test('an entry dropped from its pack is no longer found, and its vector goes with it', async () => {
    const pack = languagePack('search-dropped', [language('keep', 'Keepsake'), language('lose', 'Losable')]);
    await seed(pack);
    const [dropped] = idsAt(pack, 1);

    await seed(languagePack('search-dropped', [language('keep', 'Keepsake')]), laterSeed);

    const lost = await ask('losable');
    const kept = await ask('keepsake');
    expect(lost.total).toBe(0);
    expect(kept.ids).toStrictEqual(idsAt(pack, 0));
    const remaining = await database.db
      .select({ id: contentEntrySearch.id })
      .from(contentEntrySearch)
      .where(sql`${contentEntrySearch.entryId} = ${dropped}`);
    expect(remaining).toStrictEqual([]);
  });

  describe('homebrew', () => {
    test('a homebrew pack is searched only when it is named', async () => {
      const pack = await ownedPack('search-brew');

      const unnamed = await ask('moonlit');
      const named = await ask('moonlit', { packs: [contentPackId(pack.file.id)] });

      expect(unnamed.total).toBe(0);
      expect(named.ids).toStrictEqual(idsAt(pack, 0));
    });

    test('official entries are found whether or not a homebrew pack is named', async () => {
      const brew = await ownedPack('search-brew-too');
      const official = languagePack('search-official', [language('moonstone', 'Moonstone', 'A pale gem.')]);
      await seed(official);

      const result = await ask('moonstone', { packs: [contentPackId(brew.file.id)] });

      expect(result.ids).toStrictEqual(idsAt(official, 0));
    });
  });

  test('a renamed entry is found by its new name straight away, whoever wrote it', async () => {
    const pack = languagePack('search-direct', [language('lode', 'Lodestone', 'Points north.')]);
    await seed(pack);
    const [id] = idsAt(pack, 0);

    await database.db
      .update(contentEntries)
      .set({ name: ContentText.parse('Lodestar') })
      .where(sql`${contentEntries.id} = ${id}`);

    const renamed = await ask('lodestar');
    const old = await ask('lodestone');
    expect(renamed.ids).toStrictEqual(idsAt(pack, 0));
    expect(old.total).toBe(0);
  });

  test('the words are matched through the GIN index', async () => {
    const plan = await database.db.$client.begin(async (tx): Promise<unknown> => {
      await tx.unsafe('set local enable_seqscan = off');
      return tx.unsafe(
        `explain (format json) select entry_id from content_entry_search where vector @@ websearch_to_tsquery('english', 'prismatic')`,
      );
    });

    expect(JSON.stringify(plan)).toContain('content_entry_search_vector_idx');
  });
});
