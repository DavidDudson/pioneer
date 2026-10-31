import { TestBed } from '@angular/core/testing';
import {
  AncestryId,
  ContentEntry,
  contentId,
  ContentKind,
  ContentSearchQuery,
  ContentText,
  EntrySlug,
  packContentsFromFiles,
  PackId,
  SearchText,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import type { BundleStore } from './bundle-store';
import { ContentLoader } from './content-loader';
import { CONTENT_PACK_CACHE } from './content-pack-cache';
import type { ContentPackCache } from './content-pack-cache';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
const idOf = (slug: string): string => contentId(PACK, EntrySlug.parse(slug));

function entry(kind: string, name: string, data: object): object {
  const slug = `${kind}:${name}`;
  return {
    id: idOf(slug),
    pack: PACK,
    kind,
    slug,
    name: `${name} name`,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    data,
  };
}

const ancestry = entry('ancestry', 'lizardfolk', {
  hitPoints: 8,
  size: 'medium',
  speed: 25,
  boosts: [['str'], ['wis']],
  flaws: ['int'],
  languages: [idOf('language:common')],
  additionalLanguages: { count: 0, options: [] },
  reach: 5,
});
const common = entry('language', 'common', {});
const contents: PackContents = packContentsFromFiles(packFile, [[ancestry, common]]);
const packs: readonly PackContentsLoader[] = [{ id: PACK, load: async (): Promise<PackContents> => contents }];
const spoken = [{ type: 'paragraph', content: [{ type: 'text', text: 'Spoken everywhere.' }] }];
const described: PackContents = packContentsFromFiles(packFile, [[ancestry, { ...common, description: spoken }]]);
const describedPacks: readonly PackContentsLoader[] = [
  { id: PACK, load: async (): Promise<PackContents> => described },
];
const renamed: PackContents = packContentsFromFiles(packFile, [[ancestry, { ...common, name: 'Common (Taldane)' }]]);
const reseeded: readonly PackContentsLoader[] = [{ id: PACK, load: async (): Promise<PackContents> => renamed }];

interface Loaded {
  readonly loader: ContentLoader;
  readonly delivery: TestContentDelivery;
  /** Runs the work scheduled for idle. */
  readonly idle: () => void;
}

/** A loader over `store`, building into `packCache`: a fresh one unless a test shares it, so each test parses anew. */
function load(
  store: BundleStore = new MemoryBundleStore(),
  packCache: ContentPackCache = new Map(),
  served: readonly PackContentsLoader[] = packs,
): Loaded {
  const delivery = new TestContentDelivery(served);
  const waiting: (() => void)[] = [];
  TestBed.configureTestingModule({
    providers: [
      ...provideContentTesting(delivery, store),
      { provide: CONTENT_PACK_CACHE, useValue: packCache },
      {
        provide: IDLE_SCHEDULER,
        useValue: (task: () => void): void => {
          waiting.push(task);
        },
      },
    ],
  });
  const idle = (): void => {
    for (const task of waiting.splice(0)) {
      task();
    }
  };
  return { loader: TestBed.inject(ContentLoader), delivery, idle };
}

/** The description shards `requests` fetched. */
function descriptionRequests(requests: readonly string[]): readonly string[] {
  return requests.filter((request) => request.includes('.desc.'));
}

/** The kinds `requests` fetched bundles of, in order. */
function kindsFetched(requests: readonly string[]): readonly string[] {
  return requests.flatMap((request) => /\/(?<kind>[a-z-]+)\.mech\./u.exec(request)?.groups?.['kind'] ?? []);
}

describe(ContentLoader, () => {
  it('builds a registry of the kinds asked for', async () => {
    const { loader } = load();

    const registry = await loader.registry([ContentKind.Ancestry]);

    const lizardfolk = registry.ancestry(AncestryId.parse(idOf('ancestry:lizardfolk')));
    expect(lizardfolk?.definition.name).toBe(ContentText.parse('lizardfolk name'));
    expect(lizardfolk?.pack.manifest.title).toBe(ContentText.parse('Homebrew'));
  });

  it('fetches only the kinds asked for', async () => {
    const { loader, delivery } = load();

    await loader.registry([ContentKind.Ancestry]);

    expect(kindsFetched(delivery.requests)).toStrictEqual(['ancestry']);
  });

  it('prefetches the likely next kinds when idle', async () => {
    const { loader, delivery, idle } = load();
    await loader.registry([ContentKind.Ancestry]);

    idle();

    await expect.poll(() => kindsFetched(delivery.requests)).toStrictEqual(['ancestry', 'language']);
  });

  it('a later registry of a prefetched kind needs no request', async () => {
    const { loader, delivery, idle } = load();
    await loader.registry([ContentKind.Ancestry]);
    idle();
    await expect.poll(() => kindsFetched(delivery.requests)).toHaveLength(2);
    const before = delivery.requests.length;

    const registry = await loader.registry([ContentKind.Language]);

    expect(registry.packs[0]?.otherEntries.map((language) => language.slug)).toStrictEqual(['language:common']);
    expect(delivery.requests).toHaveLength(before);
  });

  it('a prefetch that fails is dropped, and the kind loads when needed', async () => {
    const { loader, delivery, idle } = load();
    await loader.registry([ContentKind.Ancestry]);
    delivery.offline = true;

    idle();
    await expect.poll(() => kindsFetched(delivery.requests)).toStrictEqual(['ancestry', 'language']);
    delivery.offline = false;
    const registry = await loader.registry([ContentKind.Language]);

    expect(registry.packs[0]?.otherEntries.map((language) => language.slug)).toStrictEqual(['language:common']);
  });

  it('reads the manifest again when a re-seed since it was read leaves a bundle gone', async () => {
    const { loader, delivery } = load();
    await loader.registry([ContentKind.Ancestry]);
    delivery.reseed(reseeded);

    const registry = await loader.registry([ContentKind.Language]);

    expect(registry.packs[0]?.otherEntries.map((language) => String(language.name))).toStrictEqual([
      'Common (Taldane)',
    ]);
    expect(delivery.requests.filter((request) => request === 'manifest')).toHaveLength(2);
  });

  it('a kept bundle that no longer reads is fetched again', async () => {
    const store = new MemoryBundleStore();
    const first = load(store);
    await first.loader.registry([ContentKind.Ancestry]);
    const keys = await store.keys();
    const mechanics = keys.filter((kept) => kept.includes('ancestry.mech.'));
    await Promise.all(mechanics.map(async (key) => store.write(key, [{ truncated: true }])));
    TestBed.resetTestingModule();
    const { loader } = load(store);

    const registry = await loader.registry([ContentKind.Ancestry]);

    expect(registry.ancestries()).toHaveLength(1);
  });

  it('reuses a pack built from the same bundles, still reading them, in a later page', async () => {
    const store = new MemoryBundleStore();
    const packCache: ContentPackCache = new Map();
    const first = await load(store, packCache).loader.registry([ContentKind.Ancestry]);
    TestBed.resetTestingModule();
    const { loader, delivery } = load(store, packCache);

    const second = await loader.registry([ContentKind.Ancestry]);

    expect(second.packs[0]).toBe(first.packs[0]);
    expect(delivery.requests).toStrictEqual(['manifest']);
    // Other kinds are other bundles: a pack of its own.
    await loader.registry([ContentKind.Ancestry, ContentKind.Language]);
    expect(packCache.size).toBe(2);
  });

  describe('description', () => {
    const language = ContentEntry.parse({ ...common, description: spoken });

    it('fetches the entry’s shard, and only that, once it is opened', async () => {
      const { loader, delivery } = load(new MemoryBundleStore(), new Map(), describedPacks);

      const description = await loader.description(language);

      expect(description).toStrictEqual(spoken);
      expect(descriptionRequests(delivery.requests)).toHaveLength(1);
      expect(descriptionRequests(delivery.requests)[0]).toMatch(/^homebrew\/language\.desc\.en\.[\da-f]\./u);
    });

    it('serves a shard already read without another request, and from the store on a later visit', async () => {
      const store = new MemoryBundleStore();
      const first = load(store, new Map(), describedPacks);
      await first.loader.description(language);
      await first.loader.description(language);
      expect(descriptionRequests(first.delivery.requests)).toHaveLength(1);
      TestBed.resetTestingModule();
      const { loader, delivery } = load(store, new Map(), describedPacks);

      const description = await loader.description(language);

      expect(description).toStrictEqual(spoken);
      expect(delivery.requests).toStrictEqual(['manifest']);
    });

    it('is undefined, without a request, for an entry with no description', async () => {
      const { loader, delivery } = load();

      const description = await loader.description(ContentEntry.parse(common));

      expect(description).toBeUndefined();
      expect(descriptionRequests(delivery.requests)).toStrictEqual([]);
    });

    it('fetches a kept shard that no longer reads again', async () => {
      const store = new MemoryBundleStore();
      const first = load(store, new Map(), describedPacks);
      await first.loader.description(language);
      const kept = await store.keys();
      const shards = kept.filter((key) => key.includes('.desc.'));
      await Promise.all(shards.map(async (key) => store.write(key, { [language.id]: 'truncated' })));
      TestBed.resetTestingModule();
      const { loader } = load(store, new Map(), describedPacks);

      const description = await loader.description(language);

      expect(description).toStrictEqual(spoken);
    });
  });

  describe('search', () => {
    const words = SearchText.parse('common');

    function query(kinds: readonly ContentKind[]): ContentSearchQuery {
      return ContentSearchQuery.parse({ query: words, kinds: kinds.join(',') });
    }

    it('asks the server for the entries that match, and keeps nothing', async () => {
      const { loader, delivery } = load();

      const found = await loader.search(query([]));

      expect(found).toStrictEqual({ ids: [ContentEntry.parse(common).id], total: 1 });
      expect(delivery.requests).toStrictEqual(['search']);
    });

    it('passes the kinds on', async () => {
      const { loader } = load();

      const found = await loader.search(query([ContentKind.Ancestry]));

      expect(found).toStrictEqual({ ids: [], total: 0 });
    });

    it('fails when the server cannot be reached', async () => {
      const { loader, delivery } = load();
      delivery.offline = true;

      await expect(loader.search(query([]))).rejects.toThrow('Failed to fetch');
    });
  });
});
