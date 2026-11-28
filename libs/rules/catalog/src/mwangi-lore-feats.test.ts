import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind, Selector } from '@pioneer/rules/sdk';

/** The selectors the Proficiency rules of a Mwangi Expanse feat train, by its slug. */
async function trained(slug: string): Promise<ReadonlyArray<string>> {
  const file = await import('@pioneer/content/packs/mwangi-expanse/feat.json');

  const feat = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.Feat && entry.slug === slug,
  );

  return (feat?.rules ?? []).flatMap((rule) => {
    const selector = rule.key === 'Proficiency' ? Selector.safeParse(rule.selector) : undefined;

    return selector?.success === true ? [selector.data] : [];
  });
}

describe('Mwangi Expanse: ancestry Lore feats', () => {
  test.each([
    ['feat:goloma-lore', ['skill:survival', 'skill:stealth', 'skill:lore:goloma']],
    ['feat:anadi-lore', ['skill:crafting', 'skill:survival', 'skill:lore:anadi']],
  ])('%s trains its skills and its Lore', async (slug, selectors) => {
    expect(await trained(slug)).toEqual(selectors);
  });

  test.each(['feat:conrasu-lore', 'feat:shisk-lore'])('%s trains its own Lore', async (slug) => {
    const topic = slug.replace('feat:', '').replace('-lore', '');
    expect(await trained(slug)).toContain(`skill:lore:${topic}`);
  });
});
