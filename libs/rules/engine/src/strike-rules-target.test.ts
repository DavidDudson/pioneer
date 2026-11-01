import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from './derive-statistics';
import { ruleIdOf } from './rule-in-play';
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

describe('rule elements conditioned on the target', () => {
  const VITALIZING = {
    key: 'DamageDice',
    selectors: ['damage'],
    dieSize: 'd6',
    damageType: 'vitality',
    category: 'persistent',
    predicate: ['target:trait:undead'],
  };

  /** The Strike with `element` in play, `options` known about the target, and `claimed` rules claimed for the roll. */
  function strikeWith(options: readonly string[], claimed: boolean, element: object = VITALIZING): Strike | undefined {
    const inputs = StatisticInputsJson.parse({
      level: 5,
      attributes: { str: 4, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
      ranks: { 'attack:martial': 'trained' },
      weapons: [wielded(LONGSWORD)],
    });
    const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
    const rule = inPlay(element, 'vitalizing');
    const modifiers = {
      rules: [rule],
      facts: new PredicateFacts(
        options.map((option) => RollOption.parse(option)),
        CORE_NAMESPACES,
      ),
      situation: new Set(claimed ? [ruleIdOf(rule)] : []),
    };
    const results = deriveStatistics(content, inputs, modifiers);
    return deriveStrikes(inputs.weapons ?? [], results, {
      inputs: modifiers,
      scope: { statistics: content, character: inputs },
    })[0];
  }

  test('an unknown target gives nothing, and the Strike offers the element to claim', () => {
    const strike = strikeWith([], false);

    expect(strike?.damage?.extra).toStrictEqual([]);
    expect(strike?.conditional).toStrictEqual([ruleIdOf(inPlay(VITALIZING, 'vitalizing'))]);
  });

  test('claiming the situation applies the element and stops offering it', () => {
    const strike = strikeWith([], true);

    expect(strike?.damage?.extra).toMatchObject([
      { count: 1, die: 'd6', damageType: 'vitality', category: 'persistent' },
    ]);
    expect(strike?.conditional).toStrictEqual([]);
  });

  test('a known target trait applies it outright', () => {
    const strike = strikeWith(['target:trait:undead'], false);

    expect(strike?.damage?.extra).toHaveLength(1);
    expect(strike?.conditional).toStrictEqual([]);
  });

  test('an element that does not reach the Strike is not offered', () => {
    const strike = strikeWith([], false);
    const elsewhere = { ...VITALIZING, selectors: ['spell-damage'] };

    expect(strike?.conditional).toHaveLength(1);
    expect(strikeWith([], false, elsewhere)?.conditional).toStrictEqual([]);
  });
});
