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
const BLOWGUN = { slug: 'blowgun', category: 'simple', traits: [], damage: { dice: 1, damageType: 'piercing' } };
const SENSATE = 'a bright flash of light';
const text = (words: string): object[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** The first Strike of a level 5 character wielding `weapon`, with `placed` rule elements in play. */
function strikeOf(placed: readonly (readonly [object, string])[], weapon: object = LONGSWORD): Strike | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 5,
    attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained', 'attack:simple': 'trained' },
    weapons: [wielded(weapon as { slug: string })],
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);
  const rules = placed.map(([element, entry], rule) => inPlay(element, entry, { rule }));
  const modifiers = { rules, facts };
  const results = deriveStatistics(content, inputs, modifiers);
  return deriveStrikes(inputs.weapons ?? [], results, {
    inputs: modifiers,
    scope: { statistics: content, character: inputs },
  })[0];
}

function numbers(strike: Strike | undefined): readonly number[] {
  return [Number(strike?.damage?.dice), ...(strike?.damage?.extra.map(({ count }) => Number(count)) ?? [])];
}

describe('Strike damage dice from rule elements', () => {
  test('a DamageDice with a die adds dice of its own, with their type, category and origin', () => {
    const element = {
      key: 'DamageDice',
      selectors: ['strike-damage'],
      diceNumber: 2,
      dieSize: 'd6',
      damageType: 'fire',
      category: 'precision',
    };

    const strike = strikeOf([[element, 'flame']]);

    expect(Number(strike?.damage?.dice)).toBe(1);
    expect(strike?.damage?.extra).toMatchObject([
      { count: 2, die: 'd6', damageType: 'fire', category: 'precision', critical: false },
    ]);
    expect(strike?.damage?.extra[0]?.origin).toEqual(inPlay(element, 'flame').origin);
  });

  test('an added die takes the damage type of the weapon unless it names one, and counts one die unless it says', () => {
    const strike = strikeOf([[{ key: 'DamageDice', selectors: ['damage'], dieSize: 'd4', critical: true }, 'a']]);

    expect(strike?.damage?.extra).toMatchObject([{ count: 1, die: 'd4', damageType: 'slashing', critical: true }]);
  });

  test('a DamageDice with no die adds to the weapon’s dice or overrides their type', () => {
    expect(numbers(strikeOf([[{ key: 'DamageDice', selectors: ['strike-damage'], diceNumber: 1 }, 'a']]))).toEqual([2]);
    const strike = strikeOf([[{ key: 'DamageDice', selectors: ['damage'], override: { damageType: 'cold' } }, 'a']]);

    expect(strike?.damage?.damageType).toBe('cold');
  });

  test('a formula reads the character', () => {
    const element = { key: 'DamageDice', selectors: ['damage'], diceNumber: '@level', dieSize: 'd6' };

    expect(numbers(strikeOf([[element, 'a']]))).toEqual([1, 5]);
  });

  test('an element for other selectors or a failing predicate does nothing', () => {
    const elsewhere = { key: 'DamageDice', selectors: ['spell-damage'], dieSize: 'd6' };
    const calm = { key: 'DamageDice', selectors: ['damage'], dieSize: 'd6', predicate: ['self:effect:calm'] };

    expect(
      strikeOf([
        [elsewhere, 'a'],
        [calm, 'b'],
      ])?.damage?.extra,
    ).toEqual([]);
  });

  test('a weapon with no die has flat damage that no element changes', () => {
    const strike = strikeOf([[{ key: 'DamageDice', selectors: ['damage'], diceNumber: 2 }, 'a']], BLOWGUN);

    expect(Number(strike?.damage?.dice)).toBe(1);
  });
});

/** The weapon's dice, and its extra ones, after a dice-number alteration of `mode` and `value`. */
function diceAfter(mode: string, value: number): readonly number[] {
  const alteration = { key: 'DamageAlteration', selectors: ['strike-damage'], property: 'dice-number', mode, value };
  return numbers(strikeOf([[alteration, 'a']]));
}

describe('Strike damage alterations from rule elements', () => {
  test('a dice-number alteration changes the weapon’s dice by its mode', () => {
    expect(diceAfter('add', 2)).toEqual([3]);
    expect(diceAfter('multiply', 3)).toEqual([3]);
    expect(diceAfter('override', 4)).toEqual([4]);
    expect(diceAfter('subtract', 5)).toEqual([0]);
  });

  test('a damage-type alteration changes the type of the weapon’s dice', () => {
    const element = {
      key: 'DamageAlteration',
      selectors: ['damage'],
      property: 'damage-type',
      mode: 'override',
      value: 'fire',
    };

    expect(strikeOf([[element, 'a']])?.damage?.damageType).toBe('fire');
  });
});

describe('Strike notes from rule elements', () => {
  test('a Note reaching the attack and damage rolls is on both, with its outcome and origin', () => {
    const element = {
      key: 'Note',
      selectors: ['strike-attack-roll', 'strike-damage'],
      text: text(SENSATE),
      outcome: ['criticalSuccess'],
    };

    const strike = strikeOf([[element, 'flash']]);

    expect(strike?.notes.map(({ roll, outcome }) => [roll, outcome])).toEqual([
      ['attack', ['criticalSuccess']],
      ['damage', ['criticalSuccess']],
    ]);
    expect(strike?.notes[0]?.origin).toEqual(inPlay(element, 'flash').origin);
  });

  test('a Note for other rolls, or whose predicate fails, is not on the Strike', () => {
    const elsewhere = { key: 'Note', selectors: ['perception'], text: text(SENSATE) };
    const calm = { key: 'Note', selectors: ['damage'], text: text(SENSATE), predicate: ['self:effect:calm'] };

    expect(
      strikeOf([
        [elsewhere, 'a'],
        [calm, 'b'],
      ])?.notes,
    ).toEqual([]);
  });
});
