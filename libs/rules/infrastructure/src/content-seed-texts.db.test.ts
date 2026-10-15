import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { contentPackId, EntryTextField } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';
import { fixedClock, SOURCE_LOCALE } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { asc, eq, inArray } from 'drizzle-orm';

import { seedContentPacks } from './content-seed';
import { contentEntries, contentEntryTexts } from './content.table';
import { COMMON, ELVEN, languagePack, loader } from './testing/language-packs';
import type { Language } from './testing/language-packs';

/**
 * The seed's `content_entry_texts` rows, against a throwaway Postgres database (see createTestDatabase). Skipped when
 * TEST_DATABASE_URL is unset; CI always sets it. Each test seeds its own pack, so tests share the database.
 */
const adminUrl = testDatabaseUrl();
const firstSeed = fixedClock('2026-10-10T10:00:00Z');
const laterSeed = fixedClock('2026-10-11T10:00:00Z');
const SPOKEN: Language = { ...COMMON, text: 'Spoken across the Inner Sea.' };
const SUNG: Language = { ...ELVEN, text: 'Sung, not said.' };
const SUNG_AGAIN: Language = { ...ELVEN, text: 'Sung, never said.' };

const BACKFILL = new URL('../../../../apps/api/migrations/0024_content_entry_texts_backfill.sql', import.meta.url)
  .pathname;

type TextRow = typeof contentEntryTexts.$inferSelect;

describe.skipIf(adminUrl === undefined)('seeded descriptions (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
  });

  afterAll(async () => {
    const problems = await unindexedQueries(database.db, recorder);
    expect(problems).toStrictEqual([]);
    await database.drop();
  });

  async function seed(contents: PackContents, clock: Clock = firstSeed): Promise<void> {
    await seedContentPacks(database.db, [loader(contents)], clock);
  }

  /** The pack's text rows, in the order of its entries' slugs. */
  async function storedTexts(contents: PackContents): Promise<readonly TextRow[]> {
    const rows = await database.db
      .select({ text: contentEntryTexts })
      .from(contentEntryTexts)
      .innerJoin(contentEntries, eq(contentEntries.id, contentEntryTexts.entryId))
      .where(eq(contentEntries.packId, contentPackId(contents.file.id)))
      .orderBy(asc(contentEntries.slug));
    return rows.map(({ text }) => text);
  }

  test('an entry with a description gets a source-locale row; one without gets none', async () => {
    const pack = languagePack('texts-first', [SPOKEN, { slug: 'draconic', name: 'Draconic' }]);

    await seed(pack);

    const [spoken, ...others] = await storedTexts(pack);
    expect(others).toStrictEqual([]);
    expect(spoken).toMatchObject({
      entryId: pack.entries[0]?.id,
      locale: SOURCE_LOCALE,
      field: EntryTextField.Description,
      text: pack.entries[0]?.description,
      updatedAt: '2026-10-10 10:00:00.000+00',
    });
  });

  test('an edited description is rewritten in place; an unchanged one keeps its row', async () => {
    await seed(languagePack('texts-edited', [SPOKEN, SUNG]));
    const [, before] = await storedTexts(languagePack('texts-edited', [SPOKEN, SUNG]));
    const edited = languagePack('texts-edited', [SPOKEN, SUNG_AGAIN]);

    await seed(edited, laterSeed);

    const texts = await storedTexts(edited);
    expect(texts.map(({ text }) => text)).toStrictEqual(edited.entries.map(({ description }) => description));
    expect(texts[1]?.id).toBe(before?.id);
    expect(texts.map(({ updatedAt }) => updatedAt)).toStrictEqual([
      '2026-10-10 10:00:00.000+00',
      '2026-10-11 10:00:00.000+00',
    ]);
  });

  test('a description removed from an entry deletes its row', async () => {
    await seed(languagePack('texts-removed', [SPOKEN, SUNG]));
    const trimmed = languagePack('texts-removed', [SPOKEN, ELVEN]);

    await seed(trimmed, laterSeed);

    const texts = await storedTexts(trimmed);
    expect(texts.map(({ entryId }) => entryId)).toStrictEqual([trimmed.entries[0]?.id]);
  });

  test('the backfill migration restores deleted rows and leaves existing ones alone', async () => {
    const pack = languagePack('texts-backfill', [SPOKEN, SUNG]);
    await seed(pack);
    const [spoken] = await storedTexts(pack);
    await database.db.delete(contentEntryTexts).where(inArray(contentEntryTexts.entryId, [pack.entries[1]?.id]));
    const backfill = await Bun.file(BACKFILL).text();

    await database.db.$client.unsafe(backfill);

    const texts = await storedTexts(pack);
    expect(texts.map(({ entryId }) => entryId)).toStrictEqual(pack.entries.map(({ id }) => id));
    expect(texts.map(({ text }) => text)).toStrictEqual(pack.entries.map(({ description }) => description));
    expect(texts[0]?.id).toBe(spoken?.id);
    expect(texts[1]).toMatchObject({ locale: SOURCE_LOCALE, field: EntryTextField.Description });
  });

  test('an entry removed from the pack takes its texts with it', async () => {
    const pack = languagePack('texts-cascade', [SPOKEN, SUNG]);
    await seed(pack);

    await seed(languagePack('texts-cascade', [SPOKEN]), laterSeed);

    const texts = await storedTexts(pack);
    expect(texts.map(({ entryId }) => entryId)).toStrictEqual([pack.entries[0]?.id]);
  });
});
