import { describe, expect, test } from 'bun:test';

import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { ChoiceValue, ContentRegistry, EntrySlug, Level, SlotKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

const registry = new ContentRegistry();

await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));

const entries = registry.packs.flatMap((pack) => pack.otherEntries);

function idOf(slug: string): ContentId {
  const found = entries.find((entry) => entry.slug === EntrySlug.parse(slug));

  if (found === undefined) {
    throw new Error(`${slug} is not in the catalog`);
  }

  return found.id;
}

/** A character holding the feat `slug`, with the species slot answered by `species` when given. */
function resolveWith(slug: string, picks: ReadonlyMap<SlotKey, ChoiceValue>): GrantResolution {
  return resolveGrants({
    roots: [{ entry: idOf(slug), hop: { kind: 'choice', slot: SlotKey.parse('class-feat-1') } }],
    lookup: grantLookup(registry),
    level: Level.parse(1),
    situation: [],
    picks,
    rootSlots: [],
    toggles: new Map(),
    namespaces: registry.rollOptionNamespaces(),
  });
}

/** A character holding the feat `slug`, with its species slot answered by `species` when given. */
function withFeat(slug: string, species?: string): GrantResolution {
  const [open] = resolveWith(slug, new Map()).open;

  if (species === undefined || open === undefined) {
    return resolveWith(slug, new Map());
  }

  const picked = ChoiceValue.parse(idOf(species));

  return resolveWith(slug, new Map([[open.key, picked]]));
}

describe('the Animal Companion feats', () => {
  test.each([
    'feat:animal-companion',
    'feat:animal-companion-ranger',
    'feat:beastmaster-dedication',
    'feat:additional-companion',
    'feat:cavalier-dedication',
  ])('%s opens a slot offering every species', (slug) => {
    const { open, errors } = withFeat(slug);

    expect(errors).toEqual([]);
    expect(open).toHaveLength(1);
    expect(open[0]?.options).toHaveLength(17);
    expect(open[0]?.options.map(({ label }) => String(label))).toContain('Wolf');
  });

  test('picking a species fills the slot', () => {
    expect(withFeat('feat:animal-companion', 'companion-species:wolf').open).toEqual([]);
  });
});
