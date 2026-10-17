import { TestBed } from '@angular/core/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentId, ContentKind, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { EntryPreviews } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { cutTo } from '../testing/test-packs';
import { INVENTORY_CONTENT_KINDS } from './inventory/sheet-inventory';
import { sheetEntryPreview, sheetEntryPreviews, sheetFetchingPreviews } from './sheet-entry-previews';

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

describe('previews of the kinds the spell and item rows show', () => {
  const KINDS = [
    ContentKind.Spell,
    ContentKind.Kit,
    ...INVENTORY_CONTENT_KINDS.filter((kind) => kind !== ContentKind.Rune),
  ];
  const PACKS = cutTo(KINDS);

  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it.each(KINDS)('previews a loaded %s entry', async (kind) => {
    TestBed.configureTestingModule({ providers: provideServerStateTesting([], PACKS) });
    const registry = await TestBed.inject(ContentLoader).registry([kind]);
    const entry = registry.packs.flatMap((pack) => pack.otherEntries).find((each) => each.kind === kind);

    expect(entry).toBeDefined();
    expect(sheetEntryPreview(registry, ContentId.parse(entry?.id))).toMatchObject({ name: entry?.name });
  });
});

describe(sheetEntryPreviews, () => {
  it('previews through the registry as it is loaded', async () => {
    const registry = await featRegistry();
    const feat = registry.packs.flatMap((pack) => pack.otherEntries).find((entry) => entry.kind === ContentKind.Feat);
    const held: { registry?: ContentRegistry } = {};
    const previews = sheetEntryPreviews(() => held.registry);
    const id = ContentId.parse(feat?.id);

    expect(previews.preview(id)).toBeUndefined();
    held.registry = registry;
    expect(previews.preview(id)?.name).toBe(feat?.name);
  });
});

function fetching(
  registry: Mock<LoadRegistry>,
  held: () => ContentRegistry | undefined = () => undefined,
): EntryPreviews {
  // The registry came from a module of its own; the loader here is a fake.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: ContentLoader, useValue: { registry } }] });
  return TestBed.runInInjectionContext(() => sheetFetchingPreviews(held, () => undefined));
}
function firstFeat(registry: ContentRegistry): ContentId {
  const feat = registry.packs.flatMap((pack) => pack.otherEntries).find((entry) => entry.kind === ContentKind.Feat);
  return ContentId.parse(feat?.id);
}

type LoadRegistry = (kinds: readonly ContentKind[]) => Promise<ContentRegistry>;

describe(sheetFetchingPreviews, () => {
  it('loads only the named kinds, once for concurrent calls', async () => {
    const registry = await featRegistry();
    const id = firstFeat(registry);
    const load = vi.fn<LoadRegistry>(async () => registry);
    const previews = fetching(load);

    const [first, second] = await Promise.all([previews.load?.(id), previews.load?.(id)]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]?.[0]).not.toContain(ContentKind.Feat);
    expect(first?.name).toBe(second?.name);
    expect(first).toBeDefined();
  });

  it('retries after a rejection', async () => {
    const registry = await featRegistry();
    const id = firstFeat(registry);
    const load = vi.fn<LoadRegistry>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(registry);
    const previews = fetching(load);

    await expect(previews.load?.(id)).rejects.toThrow('offline');
    const preview = await previews.load?.(id);
    expect(preview?.name).toBeDefined();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('has no preview for an id the bundles do not hold', async () => {
    const registry = await featRegistry();
    const missing = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('feat:no-such-feat')));
    const previews = fetching(vi.fn<LoadRegistry>(async () => registry));

    await expect(previews.load?.(missing)).resolves.toBeUndefined();
  });

  it('links to an entry it fetched, as to one the sheet holds, and to none it does not know', async () => {
    const registry = await featRegistry();
    const id = firstFeat(registry);
    const missing = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('feat:no-such-feat')));
    const previews = fetching(vi.fn<LoadRegistry>(async () => registry));

    expect(previews.target?.(id)).toBeUndefined();
    await previews.load?.(id);
    expect(previews.target?.(id)).toBeDefined();
    expect(previews.target?.(missing)).toBeUndefined();
  });
});
