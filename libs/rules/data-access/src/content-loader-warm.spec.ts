import { TestBed } from '@angular/core/testing';
import { AncestryId, contentId, ContentKind, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { ContentLoader } from './content-loader';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
const lizardfolk = contentId(PACK, EntrySlug.parse('ancestry:lizardfolk'));

const ancestry = {
  id: lizardfolk,
  pack: PACK,
  kind: 'ancestry',
  slug: 'ancestry:lizardfolk',
  name: 'Lizardfolk',
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
const contents: PackContents = packContentsFromFiles(packFile, [[ancestry]]);
const packs: readonly PackContentsLoader[] = [{ id: PACK, load: async (): Promise<PackContents> => contents }];

interface Loaded {
  readonly loader: ContentLoader;
  readonly delivery: TestContentDelivery;
}

function load(): Loaded {
  const delivery = new TestContentDelivery(packs);
  TestBed.configureTestingModule({ providers: provideContentTesting(delivery, new MemoryBundleStore()) });
  return { loader: TestBed.inject(ContentLoader), delivery };
}

describe('ContentLoader.warm', () => {
  it('fetches the bundles of the kinds asked for, so the registry built after needs no request', async () => {
    const { loader, delivery } = load();

    await loader.warm([ContentKind.Ancestry]);
    const warmed = delivery.requests.length;
    await loader.registry([ContentKind.Ancestry]);

    expect(warmed).toBeGreaterThan(1);
    expect(delivery.requests).toHaveLength(warmed);
  });

  it('is dropped when it fails, and the registry fetches what it needs', async () => {
    const { loader, delivery } = load();
    delivery.offline = true;

    await expect(loader.warm([ContentKind.Ancestry])).resolves.toBeUndefined();
    delivery.offline = false;

    const registry = await loader.registry([ContentKind.Ancestry]);
    const found = registry.ancestry(AncestryId.parse(lizardfolk));
    expect(found?.definition.name).toBeDefined();
  });
});
