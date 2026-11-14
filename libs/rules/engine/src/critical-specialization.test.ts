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

/** The roll options the character has, and its proficiency ranks by selector. */
interface Given {
  readonly options?: readonly string[];
  readonly ranks?: Readonly<Record<string, string>>;
}

const RAGING: readonly string[] = ['self:effect:rage'];
const TRAINED: Readonly<Record<string, string>> = { 'attack:martial': 'trained' };

/** The first Strike of a level 5 character wielding `weapon`, with `CriticalSpecialization` elements in play. */
function strikeOf(elements: readonly object[], weapon: object, given: Given = {}): Strike | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 5,
    attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: given.ranks ?? TRAINED,
    weapons: [wielded(weapon as { slug: string })],
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const facts = new PredicateFacts(
    (given.options ?? RAGING).map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
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

  test('a weapon listed by base gets it from the level the element gates on', () => {
    const gated = {
      ...ELEMENT,
      predicate: [{ gte: ['self:level', 5] }, { or: ['item:base:longsword', 'item:base:katana'] }],
    };
    const listed = { ...SWORD, rollOptions: ['base:longsword'] };

    expect(strikeOf([gated], listed, { options: ['self:level:5'] })?.notes).toHaveLength(1);
    expect(strikeOf([gated], listed, { options: ['self:level:4'] })?.notes).toEqual([]);
    expect(strikeOf([gated], SWORD, { options: ['self:level:5'] })?.notes).toEqual([]);
  });

  test('a weapon carrying a tag gets it from an element that reads the tag, and one without does not', () => {
    const tagged = { ...SWORD, rollOptions: ['group:sword', 'tag:improvised'] };

    expect(strikeOf([only('item:tag:improvised')], tagged)?.notes).toHaveLength(1);
    expect(strikeOf([only('item:tag:improvised')], SWORD)?.notes).toEqual([]);
  });

  test('a rank-gated element reaches a weapon the character is expert with, and not one it is trained with', () => {
    const gated = { ...ELEMENT, predicate: [{ gte: ['item:proficiency:rank', 2] }] };
    const options = ['self:level:5'];

    expect(strikeOf([gated], SWORD, { options, ranks: { 'attack:martial': 'expert' } })?.notes).toHaveLength(1);
    expect(strikeOf([gated], SWORD, { options, ranks: { 'attack:martial': 'master' } })?.notes).toHaveLength(1);
    expect(strikeOf([gated], SWORD, { options, ranks: { 'attack:martial': 'trained' } })?.notes).toEqual([]);
  });

  test('a rank-gated element reads a favoured weapon at the better of its category rank and the favoured weapon rank', () => {
    const gated = { ...ELEMENT, predicate: [{ gte: ['item:proficiency:rank', 3] }] };
    const ranks = { 'attack:martial': 'expert', 'attack:favored-weapon': 'master' };

    expect(strikeOf([gated], { ...SWORD, favored: true }, { options: [], ranks })?.notes).toHaveLength(1);
    expect(strikeOf([gated], SWORD, { options: [], ranks })?.notes).toEqual([]);
  });

  test('a grievous element adds the further benefit of the weapon group, not the specialization itself', () => {
    const notes = strikeOf([{ ...ELEMENT, grievous: true }], SWORD)?.notes;

    expect(notes?.map(({ roll, outcome }) => [roll, outcome])).toEqual([['damage', ['criticalSuccess']]]);
    expect(JSON.stringify(notes?.at(0)?.text)).toContain('Grievous (sword).');
    expect(JSON.stringify(notes?.at(0)?.text)).toContain('off-guard until the end of your next turn');
  });

  test('a grievous element gives nothing to a group it has no benefit for, or to a weapon with none', () => {
    const bomb = { ...LONGSWORD, group: 'bomb', rollOptions: ['group:bomb'] };

    expect(strikeOf([{ ...ELEMENT, grievous: true }], bomb)?.notes).toEqual([]);
    expect(strikeOf([{ ...ELEMENT, grievous: true }], LONGSWORD)?.notes).toEqual([]);
  });

  test('an etched grievous element does not reach a weapon its rune is not etched onto', () => {
    expect(strikeOf([{ ...ELEMENT, grievous: true, etched: true }], SWORD)?.notes).toEqual([]);
  });

  test('is given once when two elements reach the same group', () => {
    expect(strikeOf([ELEMENT, ELEMENT], SWORD)?.notes).toHaveLength(1);
  });
});
