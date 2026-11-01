import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
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
const SWORD = { ...LONGSWORD, group: 'sword', rollOptions: ['group:sword', 'melee'] };
const ELEMENT = { key: 'CriticalSpecialization' };

const only = (option: string): object => ({ ...ELEMENT, predicate: [option] });

/** The first Strike of a level 5 character wielding `weapon`, with `CriticalSpecialization` elements in play. */
function strikeOf(elements: readonly object[], weapon: object): Strike | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 5,
    attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained' },
    weapons: [wielded(weapon as { slug: string })],
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);
  const rules = elements.map((element, rule) => inPlay(element, `entry-${rule}`, { rule }));
  const modifiers = { rules, facts };
  const results = deriveStatistics(content, inputs, modifiers);
  return deriveStrikes(inputs.weapons ?? [], results, {
    inputs: modifiers,
    scope: { statistics: content, character: inputs },
  })[0];
}

describe('CriticalSpecialization', () => {
  test('gives the weapon group effect to the damage note of a critical hit', () => {
    const strike = strikeOf([ELEMENT], SWORD);
    expect(strike?.notes.map(({ roll, outcome }) => [roll, outcome])).toEqual([['damage', ['criticalSuccess']]]);
    expect(JSON.stringify(strike?.notes.at(0)?.text)).toContain('off-guard until the start of your next turn');
  });

  test('gives nothing to a weapon without a group', () => {
    expect(strikeOf([ELEMENT], LONGSWORD)?.notes).toEqual([]);
  });

  test('reads its predicate over the weapon roll options and the character facts', () => {
    expect(strikeOf([only('item:group:sword')], SWORD)?.notes).toHaveLength(1);
    expect(strikeOf([only('item:group:axe')], SWORD)?.notes).toEqual([]);
    expect(strikeOf([only('self:effect:rage')], SWORD)?.notes).toHaveLength(1);
  });

  test('is given once when two elements reach the same group', () => {
    expect(strikeOf([ELEMENT, ELEMENT], SWORD)?.notes).toHaveLength(1);
  });
});
