import { describe, expect, test } from 'bun:test';

import { ContentKind, contentKey, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

const POLYMORPH = Trait.parse('polymorph');
const SPELL_EFFECT_PREFIX = 'Spell Effect: ';
const VARIANT_SUFFIX = / \([^)]*\)$/u;

/** The `Spell Effect:` entries of the polymorph spells in the same pack that lack the trait, as `<pack>/<slug>`. */
function untraited(entries: readonly ContentEntry[]): readonly string[] {
  const polymorph = new Set<string>(
    entries
      .filter(({ kind, traits }) => kind === ContentKind.Spell && traits.includes(POLYMORPH))
      .map(({ name }) => name),
  );
  return entries
    .filter(({ kind, name, traits }) => {
      const spell = name.slice(SPELL_EFFECT_PREFIX.length).replace(VARIANT_SUFFIX, '');
      return (
        kind === ContentKind.Effect &&
        name.startsWith(SPELL_EFFECT_PREFIX) &&
        polymorph.has(spell) &&
        !traits.includes(POLYMORPH)
      );
    })
    .map(({ pack, slug }) => contentKey(pack, slug));
}

describe('polymorph spell effects', () => {
  test('every Spell Effect of a polymorph spell has the polymorph trait, so it replaces another form', async () => {
    const packs = await Promise.all(contentCatalog.map(async (loader) => loader.load()));
    const missing = packs.flatMap((pack) => untraited(pack.otherEntries));

    expect(missing).toEqual([]);
  });
});
