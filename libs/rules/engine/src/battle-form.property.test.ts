import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ModifierType, Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, property, record } from 'fast-check';

import { deriveStatistics } from './derive-statistics';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { flatModifier, inPlay } from './testing';

const VALUE_MAX = 40;
const MODIFIER_MAX = 5;
const RULES_MAX = 5;

const inputs = StatisticInputsJson.parse({
  level: 5,
  attributes: { str: 2, dex: 1, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const definitions = [
  StatisticDefinition.parse({
    slug: 'statistic:ac',
    name: 'ac',
    selector: 'ac',
    domains: [],
    base: '10 + @level + @attr.dex',
    kind: StatisticKind.Dc,
  }),
  StatisticDefinition.parse({
    slug: 'statistic:athletics',
    name: 'athletics',
    selector: 'skill:athletics',
    domains: [],
    base: '@level + @attr.str',
    kind: StatisticKind.Check,
  }),
];
const facts = new PredicateFacts([], CORE_NAMESPACES);
const TYPES = Object.values(ModifierType).filter((type) => type !== ModifierType.Attribute);
const SELECTORS = ['ac', 'skill:athletics'] as const;

const modifiers = array(
  record({
    type: constantFrom(...TYPES),
    value: integer({ min: -MODIFIER_MAX, max: MODIFIER_MAX }),
    selector: constantFrom(...SELECTORS),
  }),
  { maxLength: RULES_MAX },
).map((specs) =>
  specs.map(({ type, value, selector }, index) => inPlay(flatModifier(type, value, [selector]), `modifier-${index}`)),
);

function total(rules: readonly RuleInPlay[], selector: string): number {
  const result = deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs, {
    rules,
    facts,
  }).get(Selector.parse(selector));
  if (result === undefined || !result.ok) {
    throw new Error('expected a statistic with a value');
  }
  return result.total;
}

describe('battle form: use your own if higher', () => {
  test('never lowers Armor Class', () => {
    assert(
      property(modifiers, integer({ min: 0, max: VALUE_MAX }), (rules, value) => {
        const form = inPlay({ key: 'BattleForm', form: { armorClass: { modifier: value } } }, 'form');

        expect(total([...rules, form], 'ac')).toBeGreaterThanOrEqual(total(rules, 'ac'));
      }),
    );
  });

  test('never lowers a skill the form sets by default', () => {
    assert(
      property(modifiers, integer({ min: -VALUE_MAX, max: VALUE_MAX }), (rules, modifier) => {
        const skills = [{ skill: 'skill:athletics', modifier }];
        const form = inPlay({ key: 'BattleForm', form: { skills } }, 'form');

        expect(total([...rules, form], 'skill:athletics')).toBeGreaterThanOrEqual(total(rules, 'skill:athletics'));
      }),
    );
  });
});
