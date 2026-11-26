import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { ContentId, ContentSearchQuery, ContentText, EntryTextField, RichText } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';
import { ContentLocale, fixedClock, newId, SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq } from 'drizzle-orm';

import { ContentSearchRepository } from './content-search-repository';
import type { ContentSearchCriteria } from './content-search-repository';
import { seedContentPacks } from './content-seed';
import { contentEntryTexts } from './content.table';
import { languagePack, loader } from './testing/language-packs';
import type { Language } from './testing/language-packs';

/**
 * Content search in a locale other than the source, against a throwaway Postgres database (see createTestDatabase),
 * through the vectors the trigger on `content_entry_texts` keeps. Skipped when TEST_DATABASE_URL is unset; CI always
 * sets it. Each test seeds its own pack, and its words are its own, so tests share the database.
 */
const adminUrl = testDatabaseUrl();
const seededAt = fixedClock('2026-10-10T10:00:00Z');
const at = '2026-10-10T10:00:00Z';
const GERMAN = ContentLocale.parse('de');

interface Found {
  readonly ids: readonly string[];
  readonly total: number;
}

function language(slug: string, name: string, text: string): Language {
  return { slug, name, text };
}

function criteria(query: string, locale: ContentLocale): ContentSearchCriteria {
  return { ...ContentSearchQuery.parse({ query }), locale };
}

/** The id of the only entry in a one-entry pack. */
function idAt(contents: PackContents): ContentId {
  return ContentId.parse(contents.entries.map((entry) => entry.id).join(''));
}

function idsAt(contents: PackContents, ...indexes: readonly number[]): readonly ContentId[] {
  return indexes.map((index) => {
    const entry = contents.entries[index];

    if (entry === undefined) {
      throw new Error(`Expected an entry at ${index}`);
    }

    return ContentId.parse(entry.id);
  });
}

describe.skipIf(adminUrl === undefined)('content search in another locale (postgres)', () => {
  let database: TestDatabase;
  let search: ContentSearchRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    search = new ContentSearchRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  async function ask(query: string, locale: ContentLocale): Promise<Found> {
    const { ids, total } = await search.search(criteria(query, locale));

    return { ids: ids.map(String), total: Number(total) };
  }

  async function seed(contents: PackContents): Promise<void> {
    await seedContentPacks(database.db, [loader(contents)], seededAt);
  }

  /** Writes `id`'s German name and description, as a translator's save would. */
  async function translate(id: ContentId, name: string, description: string): Promise<void> {
    await database.db.insert(contentEntryTexts).values([
      {
        id: newId(),
        entryId: id,
        locale: GERMAN,
        field: EntryTextField.Name,
        text: ContentText.parse(name),
        updatedAt: at,
      },
      {
        id: newId(),
        entryId: id,
        locale: GERMAN,
        field: EntryTextField.Description,
        text: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: description }] }]),
        updatedAt: at,
      },
    ]);
  }

  test('a translated entry is found by its translated words, stemmed as German', async () => {
    const pack = languagePack('search-de', [language('hearth', 'Hearthstone', 'A warm stone.')]);
    await seed(pack);
    const id = idAt(pack);

    await translate(id, 'Kaminstein', 'In warmer Stein aus den Häusern.');

    const byName = await ask('kaminstein', GERMAN);
    const byStem = await ask('Haus', GERMAN);
    const english = await ask('kaminstein', SOURCE_CONTENT_LOCALE);

    expect(byName).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
    expect(byStem).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
    expect(english).toStrictEqual({ ids: [], total: 0 });
  });

  test('an entry with no translation is still found through its English words', async () => {
    const pack = languagePack('search-de-fallback', [language('rimeward', 'Rimeward', 'Frost on the sill.')]);
    await seed(pack);

    const found = await ask('rimeward', GERMAN);

    expect(found).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
  });

  test('removing the translation drops its vector, and the entry falls back', async () => {
    const pack = languagePack('search-de-removed', [language('vesper', 'Vesper', 'Evening bell.')]);
    await seed(pack);
    const id = idAt(pack);

    await translate(id, 'Abendglocke', 'Eine Glocke am Abend.');
    await database.db.delete(contentEntryTexts).where(eq(contentEntryTexts.entryId, id));

    const translated = await ask('abendglocke', GERMAN);
    const fallback = await ask('vesper', GERMAN);

    expect(translated).toStrictEqual({ ids: [], total: 0 });
    expect(fallback).toStrictEqual({ ids: idsAt(pack, 0), total: 1 });
  });
});
