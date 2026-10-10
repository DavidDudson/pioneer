import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ModifierType, RollOption, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, constant, constantFrom, integer, property, record, shuffledSubarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { LineStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult, StatisticValue } from './statistic-result';
import { flatModifier, inPlay, statistic } from './testing';

const VALUE_MAX = 5;
const MODIFIERS_MAX = 10;

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const ac = statistic('ac', '10', ['dex-based']);
const facts = new PredicateFacts([RollOption.parse('self:effect:raise-a-shield')], CORE_NAMESPACES);

/** Types that stack by type, and predicates that hold, fail or depend on the situation. */
const TYPED = Object.values(ModifierType).filter((type) => type !== ModifierType.Untyped);
const PREDICATES = [undefined, ['self:effect:raise-a-shield'], ['self:effect:rage'], ['terrain:forest']];

interface ModifierSpec {
  readonly type: string;
  readonly value: number;
  readonly target: string;
  readonly predicate: readonly string[] | undefined;
}

const typedOrNot = constantFrom(...TYPED, ModifierType.Untyped);

function modifierSpec(types: Arbitrary<string>): Arbitrary<ModifierSpec> {
  return record({
    type: types,
    value: integer({ min: -VALUE_MAX, max: VALUE_MAX }),
    target: constantFrom('ac', 'dex-based', 'all'),
    predicate: constantFrom(...PREDICATES),
  });
}

/** The fields beside type, value and target: the predicate if any, and the attribute an attribute modifier names. */
function extraFields({ type, predicate }: ModifierSpec): Record<string, unknown> {
  return {
    ...(predicate === undefined ? {} : { predicate }),
    ...(type === ModifierType.Attribute ? { attribute: 'dex' } : {}),
  };
}

/** Each spec as a rule in play on its own entry, so ids are distinct and independent of order. */
function rules(specs: readonly ModifierSpec[]): RuleInPlay[] {
  return specs.map((spec, index) =>
    inPlay({ ...flatModifier(spec.type, spec.value, [spec.target]), ...extraFields(spec) }, `modifier-${index}`),
  );
}

function derive(rulesInPlay: readonly RuleInPlay[]): StatisticValue {
  const result: StatisticResult | undefined = deriveStatistics(
    { definitions: [ac], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    inputs,
    { rules: rulesInPlay, facts },
  ).get(Selector.parse('ac'));
  if (result?.ok !== true) {
    throw new Error('AC always derives');
  }
  return result;
}

const specs = array(modifierSpec(typedOrNot), { maxLength: MODIFIERS_MAX });

describe('stacking (properties)', () => {
  test('the breakdown does not depend on the order of the rules', () => {
    const reordered = specs.chain((given) => {
      const inPlayRules = rules(given);
      return tuple(
        constant(inPlayRules),
        shuffledSubarray(inPlayRules, { minLength: inPlayRules.length, maxLength: inPlayRules.length }),
      );
    });
    assert(
      property(reordered, ([given, shuffled]) => {
        expect(derive(shuffled)).toStrictEqual(derive(given));
      }),
    );
  });

  test('the total is the base plus the applied lines', () => {
    assert(
      property(specs, (given) => {
        const value = derive(rules(given));
        const applied = value.lines.filter((line) => line.status.kind === LineStatusKind.Applied);
        const sum = applied.reduce((total, line) => total + (line.value ?? 0), 0);
        expect(value).toMatchObject({ total: value.baseValue + sum });
      }),
    );
  });

  test('untyped modifiers always sum', () => {
    const untyped = array(modifierSpec(constant(ModifierType.Untyped)), { maxLength: MODIFIERS_MAX }).map((given) =>
      given.map((spec) => ({ ...spec, predicate: undefined })),
    );
    assert(
      property(untyped, (given) => {
        const sum = given.reduce((total, { value }) => total + value, 0);
        expect(derive(rules(given))).toMatchObject({ total: 10 + sum });
      }),
    );
  });

  test('adding a typed bonus no higher than one already applied of its type never raises the total', () => {
    const withLower = tuple(specs, constantFrom(...TYPED), integer({ min: 0, max: VALUE_MAX })).filter(
      ([given, type, value]) =>
        given.some((spec) => spec.type === type && spec.predicate === undefined && spec.value >= value),
    );
    assert(
      property(withLower, ([given, type, value]) => {
        const before = derive(rules(given)).total;
        const added = [...given, { type, value, target: 'ac', predicate: undefined }];
        expect(derive(rules(added)).total).toBeLessThanOrEqual(before);
      }),
    );
  });
});
