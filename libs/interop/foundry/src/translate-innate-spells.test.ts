import { describe, expect, test } from 'bun:test';

import { RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { idOf } from './testing/import-fixtures';
import { innateSpellRules } from './translate-innate-spells';

const { InnateSpells, SpellcastingEntry, ChoiceSet } = RuleElementKey;

const spell = (slug: string): string => idOf(`spell:${slug}`);

function keyed(slug: string, key: string): Record<string, unknown>[] {
  const rules: readonly Record<string, unknown>[] = innateSpellRules(slug).map((rule) =>
    Object.fromEntries(Object.entries(rule)),
  );
  return rules.filter((rule) => rule.key === key);
}

const FEATS = [
  'feat:fey-influence',
  'feat:fey-ascension',
  'feat:grown-of-oak',
  'feat:dream-magic',
  'feat:mortal-herald-dedication',
];

describe('innateSpellRules', () => {
  test.each(FEATS)('%s gives an innate entry and every element parses', (slug) => {
    expect(keyed(slug, SpellcastingEntry)).toHaveLength(1);
    expect(keyed(slug, SpellcastingEntry)[0]).toMatchObject({ preparation: 'innate' });
    for (const rule of innateSpellRules(slug)) {
      expect(z.safeParse(RuleElement, rule).success).toBe(true);
    }
  });

  test('a feat that teaches no innate spells gives nothing', () => {
    expect(innateSpellRules('feat:power-attack')).toStrictEqual([]);
  });

  test('Fey Influence picks an animal and gives its 1st-rank spell while it is picked', () => {
    expect(keyed('feat:fey-influence', ChoiceSet)[0]).toMatchObject({
      flag: 'fey-influence',
      rollOption: 'fey-influence',
    });
    expect(keyed('feat:fey-influence', InnateSpells)).toContainEqual({
      key: InnateSpells,
      entry: 'fey-influence',
      spells: [{ rank: 1, spell: expect.any(String) as string }],
      predicate: ['fey-influence:cursed-bluebird'],
    });
  });

  test('Fey Ascension gives the spells of the animal Fey Influence picked, and its entry holds for those that have one', () => {
    const faun = keyed('feat:fey-ascension', InnateSpells).find(
      ({ predicate }) => JSON.stringify(predicate) === '["fey-influence:faun"]',
    );

    expect(faun).toMatchObject({ spells: [{ rank: 1 }, { rank: 1 }, { rank: 2 }] });
    expect(keyed('feat:fey-ascension', SpellcastingEntry)[0]).toHaveProperty('predicate');
  });

  test('Grown of Oak is one rank below a druid’s highest, by level', () => {
    const ranks = keyed('feat:grown-of-oak', InnateSpells).map((rule) => (rule.spells as { rank: number }[])[0]?.rank);

    expect(ranks).toStrictEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  test('Mortal Herald casts Heal, or Harm with void healing, heightened to half the level', () => {
    const rules = keyed('feat:mortal-herald-dedication', InnateSpells);
    const first = (spellSlug: string): unknown =>
      rules.find(({ spells }) => JSON.stringify(spells).includes(spell(spellSlug)));

    expect(rules).toHaveLength(10);
    expect(first('heal')).toMatchObject({
      spells: [{ rank: 6 }],
      predicate: [
        { not: 'deity:primary:font:harm' },
        { and: [{ gte: ['self:level', 12] }, { lt: ['self:level', 13] }] },
      ],
    });
    expect(first('harm')).toMatchObject({
      spells: [{ rank: 6 }],
      predicate: ['deity:primary:font:harm', expect.anything()],
    });
  });
});
