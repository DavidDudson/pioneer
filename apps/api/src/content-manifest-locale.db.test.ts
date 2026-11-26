import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test';

import { contentEntries, contentEntryTexts } from '@pioneer/rules/infrastructure';
import { ContentId, ContentManifest, contentPackId, ContentText, EntryTextField, PackId } from '@pioneer/rules/sdk';
import { ContentLocale, fixedClock, newId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { createTestDatabase, FakeAuthenticator, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';
import * as z from 'zod';

import { content, seedOfficialContent } from './content';

/**
 * The manifest and bundles in a locale other than the source: names come in the locale, each one it has no translation
 * of is the entry's own, marked, and the manifest's validator follows the translations. Skipped when TEST_DATABASE_URL
 * is unset; CI always sets it.
 */
setDefaultTimeout(90_000);

const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');
const IMPORTED = PackId.parse('player-core');
const GERMAN = ContentLocale.parse('de');
const Names = z.record(z.string(), z.strictObject({ name: z.string(), untranslated: z.literal(true).optional() }));

type Names = z.output<typeof Names>;

function get(path: string): Request {
  return new Request(`http://localhost${path}`);
}

function ignore(): void {
  // Seed log lines are not under test.
}

/** The validator a response carries; the manifest route always sends one. */
function etagOf(response: Response): string {
  return z.string().parse(response.headers.get('etag'));
}

async function filesOf(response: Response): Promise<readonly string[]> {
  const body = ContentManifest.parse(await response.json());
  const pack = body.packs.filter((candidate) => candidate.id === IMPORTED);

  return pack.flatMap((found) => found.kinds.map((kind) => kind.names));
}

describe.skipIf(adminUrl === undefined)('content manifest in another locale (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;
  let translatedId = ContentId.parse(newId());

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    api = new Elysia().use(problemHandler).use(content(database.db, new FakeAuthenticator()));
    await seedOfficialContent(database.db, clock, ignore);

    const entries = await database.db
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(eq(contentEntries.packId, contentPackId(IMPORTED)))
      .limit(1);

    translatedId = ContentId.parse(entries.map((entry) => entry.id).join(''));
    await database.db.insert(contentEntryTexts).values({
      id: newId(),
      entryId: translatedId,
      locale: GERMAN,
      field: EntryTextField.Name,
      text: ContentText.parse('Übersetzter Name'),
      updatedAt: '2026-10-11T10:00:00Z',
    });
  });

  afterAll(async () => {
    await database.drop();
  });

  async function manifest(path: string): Promise<Response> {
    return api.handle(get(path));
  }

  async function germanNames(): Promise<Names> {
    const files = await filesOf(await manifest('/content/manifest?locale=de'));
    const served = await Promise.all(files.map(async (file) => manifest(`/content/bundles/${IMPORTED}/${file}`)));
    const bodies = await Promise.all(served.map(async (response) => Names.parse(await response.json())));

    return Object.fromEntries(bodies.flatMap((body) => Object.entries(body)));
  }

  test('the manifest names the locale’s files, and its ETag is its own', async () => {
    const english = await manifest('/content/manifest');
    const german = await manifest('/content/manifest?locale=de');

    const files = await filesOf(german);

    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => file.includes('.names.de.'))).toBe(true);
    expect(german.headers.get('etag')).not.toBe(english.headers.get('etag'));
  });

  test('a translated name is served, and every other name falls back marked, never blank', async () => {
    const names = await germanNames();

    const others = Object.entries(names).filter(([id]) => id !== translatedId);
    const states = others.map(([, held]) => ({ untranslated: held.untranslated, blank: held.name.length === 0 }));

    expect(names[translatedId]).toStrictEqual({ name: 'Übersetzter Name' });
    expect(others.length).toBeGreaterThan(0);
    expect(states).toStrictEqual(others.map(() => ({ untranslated: true, blank: false })));
  });

  test('an edited translation changes the ETag and is served', async () => {
    const before = await manifest('/content/manifest?locale=de');
    await database.db
      .update(contentEntryTexts)
      .set({ text: ContentText.parse('Neuer Name'), updatedAt: '2026-10-12T10:00:00Z' })
      .where(eq(contentEntryTexts.entryId, translatedId));

    const after = await manifest('/content/manifest?locale=de');
    const names = await germanNames();

    expect(after.headers.get('etag')).not.toBe(before.headers.get('etag'));
    expect(names[translatedId]).toStrictEqual({ name: 'Neuer Name' });
  });

  test('a locale nobody translated is served as the source locale, whichever is asked first', async () => {
    const fresh = new Elysia().use(problemHandler).use(content(database.db, new FakeAuthenticator()));
    const unknown = await fresh.handle(get('/content/manifest?locale=zz'));
    const english = await fresh.handle(get('/content/manifest'));
    const { status } = unknown;
    const etag = etagOf(unknown);
    const files = await filesOf(unknown);

    expect(status).toBe(200);
    expect(etag).toBe(etagOf(english));
    expect(files.map((file) => file.includes('.names.en.'))).not.toContain(false);
  });

  test('a validator is not modified for its own locale', async () => {
    const german = await manifest('/content/manifest?locale=de');
    const etag = etagOf(german);

    const same = await api.handle(
      new Request('http://localhost/content/manifest?locale=de', { headers: { 'if-none-match': etag } }),
    );

    expect(same.status).toBe(304);
  });

  test('a validator of another locale is not taken for this one', async () => {
    const english = await manifest('/content/manifest');
    const etag = etagOf(english);

    const german = await api.handle(
      new Request('http://localhost/content/manifest?locale=de', { headers: { 'if-none-match': etag } }),
    );

    expect(german.status).toBe(200);
  });
});
