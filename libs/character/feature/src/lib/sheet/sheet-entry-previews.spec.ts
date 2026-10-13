import { TestBed } from '@angular/core/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentId, ContentKind, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { cutTo } from '../testing/test-packs';
import { sheetEntryPreview } from './sheet-entry-previews';

const FEAT_PACKS = cutTo([ContentKind.Feat]);

async function featRegistry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([], FEAT_PACKS) });
  return TestBed.inject(ContentLoader).registry([ContentKind.Feat]);
}

describe(sheetEntryPreview, () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], FEAT_PACKS);
  }, PREBUILD_TIMEOUT);

  it('previews a loaded feat with its name, traits, description and sources', async () => {
    const registry = await featRegistry();
    const feat = registry.packs.flatMap((pack) => pack.otherEntries).find((entry) => entry.kind === ContentKind.Feat);

    expect(feat).toBeDefined();
    expect(sheetEntryPreview(registry, ContentId.parse(feat?.id))).toMatchObject({
      name: feat?.name,
      traits: feat?.traits,
      summary: feat?.description,
      sources: feat?.sources,
    });
  });

  it('has no preview for an entry the registry does not hold, or while it loads', async () => {
    const registry = await featRegistry();
    const missing = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('feat:no-such-feat')));

    expect(sheetEntryPreview(registry, missing)).toBeUndefined();
    expect(sheetEntryPreview(undefined, missing)).toBeUndefined();
  });
});
