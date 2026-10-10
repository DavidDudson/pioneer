import { TestBed } from '@angular/core/testing';
import { bundlePath, contentId, PackId, packContentsFromFiles, Slug } from '@pioneer/rules/sdk';
import type { BundleFile, ContentManifest, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import type { BundleStore } from './bundle-store';
import { ContentBundleCache } from './content-bundle-cache';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

function language(slug: string, name: string): object {
  return {
    id: contentId(PACK, Slug.parse(slug)),
    pack: PACK,
    kind: 'language',
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 89 }],
    description: [],
    rules: [],
    data: {},
  };
}

function homebrew(name: string): readonly PackContentsLoader[] {
  const contents: PackContents = packContentsFromFiles(packFile, [[language('common', name)]]);
  return [{ id: PACK, load: async (): Promise<PackContents> => contents }];
}

interface Visit {
  readonly cache: ContentBundleCache;
  readonly delivery: TestContentDelivery;
}

/** A fresh page over `store`, served `packs`: what a later visit looks like. */
function visit(store: BundleStore, packs: readonly PackContentsLoader[] = homebrew('Common')): Visit {
  TestBed.resetTestingModule();
  const delivery = new TestContentDelivery(packs);
  TestBed.configureTestingModule({ providers: provideContentTesting(delivery, store) });
  return { cache: TestBed.inject(ContentBundleCache), delivery };
}

function languageNames(manifest: ContentManifest): BundleFile {
  const names = manifest.packs[0]?.kinds.find((kind) => kind.kind === 'language')?.names;
  if (names === undefined) {
    throw new Error('Expected a language names bundle');
  }
  return names;
}

/** Fails as IndexedDB does when the browser refuses it. */
async function refused(): Promise<never> {
  throw new Error('refused');
}

/** A store whose every call fails. */
const brokenStore: BundleStore = { read: refused, write: refused, keys: refused, remove: refused };

describe(ContentBundleCache, () => {
  it('fetches a bundle it does not hold, and keeps it', async () => {
    const store = new MemoryBundleStore();
    const { cache, delivery } = visit(store);
    const names = languageNames(await cache.manifest());

    const body = await cache.bundle(PACK, names);

    expect(body).toStrictEqual({ [contentId(PACK, Slug.parse('common'))]: { name: 'Common' } });
    expect(delivery.requests).toStrictEqual(['manifest', `${PACK}/${names}`]);
    await expect(store.read(bundlePath(PACK, names))).resolves.toStrictEqual(body);
  });

  it('serves a bundle it holds without a request', async () => {
    const store = new MemoryBundleStore();
    const first = visit(store);
    const names = languageNames(await first.cache.manifest());
    const fetched = await first.cache.bundle(PACK, names);

    const { cache, delivery } = visit(store);
    const kept = await cache.bundle(PACK, names);

    expect(kept).toStrictEqual(fetched);
    expect(delivery.requests).toStrictEqual([]);
  });

  it('reads the manifest once a session', async () => {
    const { cache, delivery } = visit(new MemoryBundleStore());

    await Promise.all([cache.manifest(), cache.manifest()]);
    await cache.manifest();

    expect(delivery.requests).toStrictEqual(['manifest']);
  });

  it('evicts bundles a new manifest no longer names', async () => {
    const store = new MemoryBundleStore();
    const first = visit(store);
    const oldNames = languageNames(await first.cache.manifest());
    await first.cache.bundle(PACK, oldNames);

    const { cache } = visit(store, homebrew('Common (Taldane)'));
    const newNames = languageNames(await cache.manifest());
    await cache.bundle(PACK, newNames);

    expect(newNames).not.toBe(oldNames);
    await expect(store.keys()).resolves.toStrictEqual(['manifest', bundlePath(PACK, newNames)]);
  });

  it('offline, serves the last manifest read and every bundle kept', async () => {
    const store = new MemoryBundleStore();
    const first = visit(store);
    const manifest = await first.cache.manifest();
    const names = languageNames(manifest);
    await first.cache.bundle(PACK, names);

    const { cache, delivery } = visit(store);
    delivery.offline = true;

    await expect(cache.manifest()).resolves.toStrictEqual(manifest);
    await expect(cache.bundle(PACK, names)).resolves.toStrictEqual(await first.cache.bundle(PACK, names));
  });

  it('offline with nothing kept, fails, and asks again next time', async () => {
    const { cache, delivery } = visit(new MemoryBundleStore());
    delivery.offline = true;

    await expect(cache.manifest()).rejects.toThrow('Failed to fetch');
    delivery.offline = false;

    const manifest = await cache.manifest();

    expect(manifest.packs).toHaveLength(1);
    expect(delivery.requests).toStrictEqual(['manifest', 'manifest']);
  });

  it('a store that fails only means fetching again', async () => {
    const { cache, delivery } = visit(brokenStore);
    const names = languageNames(await cache.manifest());

    await cache.bundle(PACK, names);
    await cache.bundle(PACK, names);

    expect(delivery.requests).toStrictEqual(['manifest', `${PACK}/${names}`, `${PACK}/${names}`]);
  });
});
