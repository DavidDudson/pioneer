import { TestBed } from '@angular/core/testing';
import {
  AncestryId,
  contentId,
  ContentKind,
  contentPackId,
  EntrySlug,
  packContentsFromFiles,
  PackId,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { ContentLoader } from './content-loader';
import { CONTENT_PACK_CACHE } from './content-pack-cache';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const OFFICIAL = PackId.parse('official-core');
const BREW = PackId.parse('table-rules');

function ancestry(pack: PackId, name: string): object {
  const slug = `ancestry:${name}`;
  return {
    id: contentId(pack, EntrySlug.parse(slug)),
    pack,
    kind: 'ancestry',
    slug,
    name: `${name} name`,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    data: {
      hitPoints: 8,
      size: 'medium',
      speed: 25,
      boosts: [['str'], ['wis']],
      flaws: ['int'],
      languages: [],
      additionalLanguages: { count: 0, options: [] },
      reach: 5,
    },
  };
}

function loaderOf(pack: PackId, name: string): PackContentsLoader {
  const contents: PackContents = packContentsFromFiles(
    { id: pack, title: pack, publisher: 'Someone', license: 'homebrew' },
    [[ancestry(pack, name)]],
  );
  return { id: pack, load: async (): Promise<PackContents> => contents };
}

const brewId = contentPackId(BREW);

interface Loaded {
  readonly loader: ContentLoader;
  readonly delivery: TestContentDelivery;
  readonly store: MemoryBundleStore;
}

function load(): Loaded {
  const delivery = new TestContentDelivery([loaderOf(OFFICIAL, 'human')], [loaderOf(BREW, 'kobold')]);
  const store = new MemoryBundleStore();
  TestBed.configureTestingModule({
    providers: [
      ...provideContentTesting(delivery, store),
      { provide: CONTENT_PACK_CACHE, useValue: new Map() },
      { provide: IDLE_SCHEDULER, useValue: (): void => {} },
    ],
  });
  return { loader: TestBed.inject(ContentLoader), delivery, store };
}

function ancestryIn(pack: PackId, name: string): AncestryId {
  return AncestryId.parse(contentId(pack, EntrySlug.parse(`ancestry:${name}`)));
}

describe('ContentLoader with homebrew packs', () => {
  it('adds the homebrew packs asked for to the official ones', async () => {
    const { loader } = load();

    const registry = await loader.registry([ContentKind.Ancestry], [brewId]);

    expect(registry.ancestry(ancestryIn(OFFICIAL, 'human'))).toBeDefined();
    expect(registry.ancestry(ancestryIn(BREW, 'kobold'))).toBeDefined();
  });

  it('asks for no homebrew when none is wanted', async () => {
    const { loader, delivery } = load();

    const registry = await loader.registry([ContentKind.Ancestry]);

    expect(registry.ancestry(ancestryIn(BREW, 'kobold'))).toBeUndefined();
    expect(delivery.requests.filter((request) => request.startsWith('homebrew'))).toStrictEqual([]);
  });

  it('reads the homebrew manifest and each bundle once a session', async () => {
    const { loader, delivery } = load();
    await loader.registry([ContentKind.Ancestry], [brewId]);
    const before = delivery.requests.length;

    await loader.registry([ContentKind.Ancestry], [brewId]);

    expect(delivery.requests.slice(before).filter((request) => request.startsWith('homebrew'))).toStrictEqual([]);
  });

  it('does not keep homebrew in the store, which outlives the session', async () => {
    const { loader, store } = load();

    await loader.registry([ContentKind.Ancestry], [brewId]);

    const kept = await store.keys();
    expect(kept.some((key) => key.includes(BREW))).toBe(false);
    expect(kept.some((key) => key.includes(OFFICIAL))).toBe(true);
  });
});
