import { TestBed } from '@angular/core/testing';
import { contentId, ContentKind, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { ContentLoader } from './content-loader';
import { CONTENT_PACK_CACHE } from './content-pack-cache';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };

const common = {
  id: contentId(PACK, EntrySlug.parse('language:common')),
  pack: PACK,
  kind: 'language',
  slug: 'language:common',
  name: 'Common',
  rarity: 'common',
  traits: [],
  sources: [{ kind: 'book', book: 'player-core', page: 1 }],
  description: [],
  rules: [],
  data: {},
};

const contents: PackContents = packContentsFromFiles(packFile, [[common]]);
const packs: ReadonlyArray<PackContentsLoader> = [{ id: PACK, load: async (): Promise<PackContents> => contents }];

function createLoader(): ContentLoader {
  TestBed.configureTestingModule({
    providers: [
      ...provideContentTesting(new TestContentDelivery(packs), new MemoryBundleStore()),
      { provide: CONTENT_PACK_CACHE, useValue: new Map() },
      { provide: IDLE_SCHEDULER, useValue: (): void => {} },
    ],
  });

  return TestBed.inject(ContentLoader);
}

describe('ContentLoader entries', () => {
  it('gives registries of different kind sets the same entry objects for a kind they share', async () => {
    const loader = createLoader();
    const wider = await loader.registry([ContentKind.Ancestry, ContentKind.Language]);

    const narrower = await loader.registry([ContentKind.Language]);

    const [shared] = narrower.packs.flatMap((pack) => pack.otherEntries);
    expect(shared).toBeDefined();
    expect(wider.packs.flatMap((pack) => pack.otherEntries)).toContain(shared);
  });
});
