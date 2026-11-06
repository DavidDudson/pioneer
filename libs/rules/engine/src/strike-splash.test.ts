import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from './derive-statistics';
import { StatisticInputsJson } from './statistic-inputs';
import { deriveStrikes } from './strikes';
import type { Strike } from './strikes';
import { inPlay, wielded } from './testing';

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
const GREATSWORD = { ...LONGSWORD, damage: { dice: 2, die: 'd12', damageType: 'slashing' } };
const BLOWGUN = { slug: 'blowgun', category: 'simple', traits: [], damage: { dice: 1, damageType: 'piercing' } };

const SHOCKWAVE = {
  key: 'DamageDice',
  selectors: ['damage'],
  category: 'splash',
  damageType: 'bludgeoning',
  perWeaponDie: true,
};

/** The first Strike of a level 5 character wielding `weapon`, with `placed` rule elements in play. */
function strikeOf(placed: readonly (readonly [object, string])[], weapon: object): Strike | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 5,
    attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained', 'attack:simple': 'trained' },
    weapons: [wielded(weapon as { slug: string })],
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const rules = placed.map(([element, entry], rule) => inPlay(element, entry, { rule }));
  const modifiers = { rules, facts: new PredicateFacts([], CORE_NAMESPACES) };
  const results = deriveStatistics(content, inputs, modifiers);
  return deriveStrikes(inputs.weapons ?? [], results, {
    inputs: modifiers,
    scope: { statistics: content, character: inputs },
  })[0];
}

describe('flat splash from DamageDice', () => {
  test('with perWeaponDie it equals the number of weapon damage dice, and leaves the dice alone', () => {
    const strike = strikeOf([[SHOCKWAVE, 'shockwave']], GREATSWORD);

    expect(strike?.damage?.ruleSplash).toMatchObject([{ amount: 2, damageType: 'bludgeoning' }]);
    expect(Number(strike?.damage?.dice)).toBe(2);
    expect(strike?.damage?.extra).toStrictEqual([]);
  });

  test('counts the dice other elements add to the weapon', () => {
    const more = { key: 'DamageDice', selectors: ['damage'], diceNumber: 1 };
    const strike = strikeOf(
      [
        [SHOCKWAVE, 'shockwave'],
        [more, 'striking'],
      ],
      LONGSWORD,
    );

    expect(strike?.damage?.ruleSplash).toMatchObject([{ amount: 2 }]);
  });

  test('without perWeaponDie it is the flat amount given', () => {
    const flat = { ...SHOCKWAVE, perWeaponDie: undefined, diceNumber: 3 };

    expect(strikeOf([[flat, 'splash']], LONGSWORD)?.damage?.ruleSplash).toMatchObject([{ amount: 3 }]);
  });

  test('a weapon with no die has none, and a Strike without such elements has none', () => {
    expect(strikeOf([[SHOCKWAVE, 'shockwave']], BLOWGUN)?.damage?.ruleSplash).toStrictEqual([]);
    expect(strikeOf([], LONGSWORD)?.damage?.ruleSplash).toStrictEqual([]);
  });
});
