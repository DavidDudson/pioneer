import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from './derive-statistics';
import { StatisticInputsJson } from './statistic-inputs';
import { deriveStrikes } from './strikes';
import type { Strike } from './strikes';
import { wielded } from './testing';

const DEFINITIONS = [
  StatisticDefinition.parse({
    slug: 'statistic:strike',
    name: 'Strike',
    selector: 'strike',
    domains: ['check', 'attack-roll', 'strike-attack-roll'],
    base: '@weapon.attr + @weapon.prof',
    kind: StatisticKind.Check,
    per: 'weapon',
  }),
  StatisticDefinition.parse({
    slug: 'statistic:strike-damage',
    name: 'Strike Damage',
    selector: 'strike-damage',
    domains: ['damage', 'strike-damage'],
    base: '@weapon.damage',
    kind: StatisticKind.Value,
    per: 'weapon',
  }),
];

const LONGSWORD = {
  slug: 'longsword',
  category: 'martial',
  traits: [],
  damage: { dice: 1, die: 'd8', damageType: 'slashing' },
};
const DAGGER = {
  slug: 'dagger',
  category: 'simple',
  traits: ['agile', 'finesse', 'thrown-10'],
  damage: { dice: 1, die: 'd4', damageType: 'piercing' },
};
const SHORTBOW = {
  slug: 'shortbow',
  category: 'martial',
  traits: ['deadly-d10'],
  range: 60,
  damage: { dice: 1, die: 'd6', damageType: 'piercing' },
};
const JEZAIL = {
  slug: 'jezail',
  category: 'martial',
  traits: ['propulsive'],
  range: 30,
  damage: { dice: 1, die: 'd6', damageType: 'bludgeoning' },
};
const BLOWGUN = {
  slug: 'blowgun',
  category: 'simple',
  traits: [],
  range: 20,
  damage: { dice: 1, damageType: 'piercing' },
};
const GLUE_BOMB = {
  slug: 'glue-bomb',
  category: 'simple',
  traits: [],
  range: 20,
  damage: { dice: 0, damageType: 'bludgeoning' },
};

/** Strikes for `weapons` of a level 1 character with Strength `strength` and Dexterity 3. */
function strikesOf(weapons: readonly object[], strength = 4): readonly Strike[] {
  const inputs = StatisticInputsJson.parse({
    level: 1,
    attributes: { str: strength, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained', 'attack:simple': 'trained' },
    weapons: weapons.map((weapon) => wielded(weapon as { slug: string })),
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const results = deriveStatistics(content, inputs, { rules: [], facts: new PredicateFacts([], CORE_NAMESPACES) });
  return deriveStrikes(inputs.weapons ?? [], results);
}

/** A branded number as the plain one a test compares. */
function plain(value: number | undefined): number | undefined {
  return value;
}

function bonusOf(strike: Strike | undefined): number | undefined {
  const bonus = strike?.damage?.bonus;
  return bonus?.ok === true ? bonus.total : undefined;
}

describe('Strike damage', () => {
  test('a melee weapon rolls its dice and adds Strength', () => {
    const [sword] = strikesOf([LONGSWORD]);
    expect(sword?.damage).toMatchObject({ dice: 1, die: 'd8', damageType: 'slashing' });
    expect(bonusOf(sword)).toBe(4);
  });

  test('a thrown weapon adds Strength, a bow adds nothing, a propulsive one half a positive Strength or all a negative one', () => {
    const strikes = strikesOf([DAGGER, SHORTBOW, JEZAIL], 5);
    expect(strikes.map((strike) => bonusOf(strike))).toStrictEqual([5, 0, 2]);
    expect(strikesOf([JEZAIL], -2).map((strike) => bonusOf(strike))).toStrictEqual([-2]);
  });

  test('a striking rune adds a die per grade, and flat damage has none to add', () => {
    const strikes = strikesOf([
      { ...LONGSWORD, striking: 1 },
      { ...LONGSWORD, slug: 'greater', striking: 2 },
      { ...BLOWGUN, striking: 1 },
    ]);
    expect(strikes.map(({ damage }) => plain(damage?.dice))).toStrictEqual([2, 3, 1]);
    expect(strikes[2]?.damage?.die).toBeUndefined();
  });

  test('a weapon with no dice and no die does no damage', () => {
    expect(strikesOf([GLUE_BOMB])[0]?.damage).toBeUndefined();
  });

  test('each weapon has its own flat damage statistic', () => {
    const [sword, dagger] = strikesOf([LONGSWORD, DAGGER]);
    expect(bonusOf(sword)).toBe(4);
    expect(bonusOf(dagger)).toBe(4);
    expect(sword?.attack).toMatchObject({ ok: true, selector: Selector.parse('strike:longsword') });
    expect(dagger?.damage?.bonus).toMatchObject({ selector: Selector.parse('strike-damage:dagger') });
  });
});

describe('the multiple attack penalty', () => {
  test('is -5 and -10, or -4 and -8 with an agile weapon', () => {
    const [sword, dagger] = strikesOf([LONGSWORD, DAGGER]);
    expect([sword?.map.second, sword?.map.third].map((penalty) => plain(penalty))).toStrictEqual([-5, -10]);
    expect([dagger?.map.second, dagger?.map.third].map((penalty) => plain(penalty))).toStrictEqual([-4, -8]);
  });
});
