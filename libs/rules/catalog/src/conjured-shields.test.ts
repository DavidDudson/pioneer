import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind, RuleElementKey } from '@pioneer/rules/sdk';

/** The `GrantShield` rule of the effect `slug` in `pack`, with how its Hardness rises by spell rank. */
async function shieldOf(pack: string, slug: string): Promise<Record<string, unknown> | undefined> {
  const file: unknown = await Bun.file(`${import.meta.dir}/../../../../content/packs/${pack}/effect.json`).json();
  const effect = ContentEntryFile.parse(file).find((entry) => entry.kind === ContentKind.Effect && entry.slug === slug);
  return effect?.rules.find((rule) => rule.key === RuleElementKey.GrantShield);
}

describe('spells that conjure a shield', () => {
  test.each([
    { pack: 'player-core', spell: 'shield', hardness: 5, heightened: [10, 15, 20, 25] },
    { pack: 'rage-of-elements', spell: 'glass-shield', hardness: 2, heightened: [4, 7, 10, 12] },
    { pack: 'rage-of-elements', spell: 'shielded-arm', hardness: 4, heightened: [8, 12, 16, 20] },
    { pack: 'impossible-magic', spell: 'bone-shield', hardness: 3, heightened: [6, 9, 12, 15] },
  ])(
    '$pack: $spell has Hardness $hardness, heightened to $heightened',
    async ({ pack, spell, hardness, heightened }) => {
      const rule = await shieldOf(pack, `effect:spell-effect-${spell}`);

      expect(rule).toMatchObject({ hardness, brackets: heightened.map((bracket) => ({ hardness: bracket })) });
    },
  );

  test.each([
    ['player-core', 'shield'],
    ['rage-of-elements', 'glass-shield'],
  ])('%s: %s ends after one Shield Block', async (pack, spell) => {
    expect(await shieldOf(pack, `effect:spell-effect-${spell}`)).toMatchObject({ endsOnBlock: true });
  });

  test('Shielded Arm has 15 Hit Points and no Broken Threshold, and ends when they are spent', async () => {
    const rule = await shieldOf('rage-of-elements', 'effect:spell-effect-shielded-arm');

    expect(rule).toMatchObject({ hitPoints: 15, brokenThreshold: 0, endsWhenDestroyed: true });
  });

  test('Bone Shield has 1 Hit Point and no Broken Threshold, and is whole again once destroyed', async () => {
    const rule = await shieldOf('impossible-magic', 'effect:spell-effect-bone-shield');

    expect(rule).toMatchObject({ hitPoints: 1, brokenThreshold: 0 });
    expect(rule).not.toHaveProperty('endsWhenDestroyed');
  });
});
