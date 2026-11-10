import { TestBed } from '@angular/core/testing';
import { bundlePath, contentId, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { BundleFile, ContentManifest, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { MANIFEST_KEY } from './bundle-store';
import type { BundleStore } from './bundle-store';
import { ContentBundleCache } from './content-bundle-cache';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

function language(name: string, label: string): object {
  const slug = `language:${name}`;
  return {
    id: contentId(PACK, EntrySlug.parse(slug)),
    pack: PACK,
    kind: 'language',
    slug,
    name: label,
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

/** Lets the store calls the cache makes in the background finish. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

interface SlowStore {
  readonly store: BundleStore;
  /** Lets the writes held back go through. */
  readonly release: () => void;
}

/** A store whose writes wait until `release` is called. */
function slowWrites(): SlowStore {
  const memory = new MemoryBundleStore();
  const gate = Promise.withResolvers<undefined>();
  return {
    store: {
      read: memory.read,
      keys: memory.keys,
      remove: memory.remove,
      write: async (key, body): Promise<void> => {
        await gate.promise;
        await memory.write(key, body);
      },
    },
    release: (): void => {
      gate.resolve(undefined);
    },
  };
}

describe(ContentBundleCache, () => {
  it('fetches a bundle it does not hold, and keeps it', async () => {
    const store = new MemoryBundleStore();
    const { cache, delivery } = visit(store);
    const names = languageNames(await cache.manifest());

    const body = await cache.bundle(PACK, names);

    expect(body).toStrictEqual({ [contentId(PACK, EntrySlug.parse('language:common'))]: { name: 'Common' } });
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
    await settle();

    expect(newNames).not.toBe(oldNames);
    await expect(store.keys()).resolves.toStrictEqual(['manifest', bundlePath(PACK, newNames)]);
  });

  it('offline, serves the last manifest read and every bundle kept', async () => {
    const store = new MemoryBundleStore();
    const first = visit(store);
    const manifest = await first.cache.manifest();
    const names = languageNames(manifest);
    await first.cache.bundle(PACK, names);
    await settle();

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

  it('answers the manifest without waiting for the store to keep it', async () => {
    const { store, release } = slowWrites();
    const { cache } = visit(store);

    const manifest = await cache.manifest();

    expect(manifest.packs).toHaveLength(1);
    await expect(store.read(MANIFEST_KEY)).resolves.toBeUndefined();
    release();
    await settle();
    await expect(store.read(MANIFEST_KEY)).resolves.toStrictEqual(manifest);
  });

  it('shares one fetch between asks for a bundle made while it is in flight', async () => {
    const { cache, delivery } = visit(new MemoryBundleStore());
    const names = languageNames(await cache.manifest());

    const [first, second, third] = await Promise.all([
      cache.bundle(PACK, names),
      cache.bundle(PACK, names),
      cache.bundle(PACK, names),
    ]);

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(delivery.requests).toStrictEqual(['manifest', `${PACK}/${names}`]);
  });

  it('does not keep a failed bundle read, so the next ask fetches again', async () => {
    const { cache, delivery } = visit(new MemoryBundleStore());
    const names = languageNames(await cache.manifest());
    delivery.offline = true;

    await expect(cache.bundle(PACK, names)).rejects.toThrow('Failed to fetch');
    delivery.offline = false;

    await expect(cache.bundle(PACK, names)).resolves.toBeDefined();
  });
});
