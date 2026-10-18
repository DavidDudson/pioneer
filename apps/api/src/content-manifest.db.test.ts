import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test';

import { ContentManifest } from '@pioneer/rules/sdk';
import type { PackBundles } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { createTestDatabase, FakeAuthenticator, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { content, seedOfficialContent } from './content';

/**
 * What the manifest says about a pack beyond its files: the size of each
 * bundle, which the Legal page lists. Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
setDefaultTimeout(30_000);
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');
const IMPORTED = 'player-core';

function get(path: string): Request {
  return new Request(`http://localhost${path}`);
}

function ignore(): void {
  // Seed log lines are not under test.
}

function packIn(packs: readonly PackBundles[], id: string): PackBundles {
  const found = packs.find((pack) => pack.id === id);
  if (found === undefined) {
    throw new Error(`Expected ${id} in the manifest`);
  }
  return found;
}

function sizeEntries(pack: PackBundles): readonly [string, unknown][] {
  if (pack.sizes === undefined) {
    throw new Error(`Expected sizes for ${pack.id} in the manifest`);
  }
  return Object.entries(pack.sizes);
}

describe.skipIf(adminUrl === undefined)('content manifest sizes (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    api = new Elysia().use(problemHandler).use(content(database.db, new FakeAuthenticator()));
    await seedOfficialContent(database.db, clock, ignore);
  });

  afterAll(async () => {
    await database.drop();
  });

  async function packs(): Promise<readonly PackBundles[]> {
    const response = await api.handle(get('/content/manifest'));
    return ContentManifest.parse(await response.json()).packs;
  }

  async function servedSizes(pack: PackBundles): Promise<readonly number[]> {
    const served = await Promise.all(
      sizeEntries(pack).map(async ([file]) => api.handle(get(`/content/bundles/${pack.id}/${file}`))),
    );
    const bodies = await Promise.all(served.map(async (response) => response.text()));
    return bodies.map((body) => new TextEncoder().encode(body).length);
  }

  test('every bundle is sized as the bytes served', async () => {
    const pack = packIn(await packs(), IMPORTED);

    const listed = sizeEntries(pack).map(([, size]) => Number(size));
    const served = await servedSizes(pack);

    expect(listed.length).toBeGreaterThan(0);
    expect(listed).toStrictEqual([...served]);
  });
});
