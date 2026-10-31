import { describe, expect, test } from 'bun:test';

import { contentKey, ContentKind, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

const POLYMORPH = Trait.parse('polymorph');
/** The name prefix of an effect, by the kinds of entry it is the effect of. */
const EFFECT_PREFIXES: readonly (readonly [string, readonly ContentKind[]])[] = [
  ['Spell Effect: ', [ContentKind.Spell]],
  ['Effect: ', [ContentKind.Feat, ContentKind.Action]],
];
const VARIANT_SUFFIX = / \([^)]*\)$/u;

/** The effects in `entries` of a polymorph spell, feat or action of the same pack that lack the trait, as keys. */
function untraited(entries: readonly ContentEntry[]): readonly string[] {
  const polymorph = new Set<string>(
    entries.filter(({ traits }) => traits.includes(POLYMORPH)).map(({ kind, name }) => `${kind}:${name}`),
  );
  return entries
    .filter(({ kind, name, traits }) => {
      const given = EFFECT_PREFIXES.find(([prefix]) => name.startsWith(prefix));
      if (kind !== ContentKind.Effect || given === undefined || traits.includes(POLYMORPH)) {
        return false;
      }
      const [prefix, kinds] = given;
      const source = name.slice(prefix.length).replace(VARIANT_SUFFIX, '');
      return kinds.some((each) => polymorph.has(`${each}:${source}`));
    })
    .map(({ pack, slug }) => contentKey(pack, slug));
}

describe('polymorph effects', () => {
  test('every effect of a polymorph spell, feat or action has the polymorph trait, so it replaces another form', async () => {
    const packs = await Promise.all(contentCatalog.map(async (loader) => loader.load()));
    const missing = packs.flatMap((pack) => untraited(pack.otherEntries));

    expect(missing).toEqual([]);
  });
});
