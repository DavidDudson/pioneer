import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ModifierType, RollOption, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import {
  array,
  assert,
  boolean,
  constant,
  constantFrom,
  integer,
  property,
  record,
  shuffledSubarray,
  tuple,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { LineStatusKind } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult, StatisticValue } from './statistic-result';
import { flatModifier, inPlay, statistic } from './testing';

const VALUE_MAX = 5;
const MODIFIERS_MAX = 10;
const ADJUSTMENTS_MAX = 3;

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
/** The slug some modifiers carry, so adjustments can find them. */
const SLUG = 'cover';

interface ModifierSpec {
  readonly type: string;
  readonly value: number;
  readonly target: string;
  readonly predicate: readonly string[] | undefined;
  readonly slug: string | undefined;
}

const typedOrNot = constantFrom(...TYPED, ModifierType.Untyped);

function modifierSpec(types: Arbitrary<string>): Arbitrary<ModifierSpec> {
  return record({
    type: types,
    value: integer({ min: -VALUE_MAX, max: VALUE_MAX }),
    target: constantFrom('ac', 'dex-based', 'all'),
    predicate: constantFrom(...PREDICATES),
    slug: constantFrom(undefined, SLUG),
  });
}

/** The fields beside type, value and target: the predicate if any, and the attribute an attribute modifier names. */
function extraFields({ type, predicate, slug }: ModifierSpec): Record<string, unknown> {
  return {
    ...(predicate === undefined ? {} : { predicate }),
    ...(slug === undefined ? {} : { slug }),
    ...(type === ModifierType.Attribute ? { attribute: 'dex' } : {}),
  };
}

/** Each spec as a rule in play on its own entry, so ids are distinct and independent of order. */
function rules(specs: readonly ModifierSpec[]): RuleInPlay[] {
  return specs.map((spec, index) =>
    inPlay({ ...flatModifier(spec.type, spec.value, [spec.target]), ...extraFields(spec) }, `modifier-${index}`),
  );
}

/** An `AdjustModifier` on AC: for the slugged modifiers or every one, holding always or only in a forest. */
interface AdjustmentSpec {
  readonly slug: string | undefined;
  readonly suppress: boolean;
  readonly value: number;
  readonly predicate: readonly string[] | undefined;
}

const adjustmentSpecs = array(
  record({
    slug: constantFrom(undefined, SLUG),
    suppress: boolean(),
    value: integer({ min: -VALUE_MAX, max: VALUE_MAX }),
    predicate: constantFrom(undefined, ['terrain:forest']),
  }),
  { maxLength: ADJUSTMENTS_MAX },
);

function adjustments(specs: readonly AdjustmentSpec[]): RuleInPlay[] {
  return specs.map(({ slug, suppress, value, predicate }, index) =>
    inPlay(
      {
        key: 'AdjustModifier',
        selectors: ['ac'],
        ...(slug === undefined ? {} : { slug }),
        ...(suppress ? { suppress } : { mode: 'add', value }),
        ...(predicate === undefined ? {} : { predicate }),
      },
      `adjustment-${index}`,
    ),
  );
}

function deriveIn(rulesInPlay: readonly RuleInPlay[], known: PredicateFacts): StatisticValue {
  const result: StatisticResult | undefined = deriveStatistics(
    { definitions: [ac], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    inputs,
    { rules: rulesInPlay, facts: known },
  ).get(Selector.parse('ac'));
  if (result?.ok !== true) {
    throw new Error('AC always derives');
  }
  return result;
}

function derive(rulesInPlay: readonly RuleInPlay[]): StatisticValue {
  return deriveIn(rulesInPlay, facts);
}

const specs = array(modifierSpec(typedOrNot), { maxLength: MODIFIERS_MAX });

/** An applied typed line on AC and a conditional one of its type and sign no larger, which it beats. */
const beatenPair: Arbitrary<ModifierSpec[]> = tuple(
  constantFrom(...TYPED),
  integer({ min: 1, max: VALUE_MAX }),
  constantFrom(1, -1),
  constantFrom(undefined, SLUG),
).chain(([type, larger, sign, slug]) =>
  integer({ min: 1, max: larger }).map((smaller) => [
    { type, value: sign * larger, target: 'ac', predicate: undefined, slug },
    { type, value: sign * smaller, target: 'ac', predicate: ['terrain:forest'], slug: undefined },
  ]),
);

/** The line that beats a conditional line; undefined for any other line, or one nothing beats. */
function beatenByOf({ status }: BreakdownLine): RuleId | undefined {
  return status.kind === LineStatusKind.Conditional ? status.beatenBy : undefined;
}

/** The applied lines of the line's type and direction that are at least as large as it. */
function rivalsOf(line: BreakdownLine, lines: readonly BreakdownLine[]): BreakdownLine[] {
  const value = line.value ?? 0;
  return lines.filter(
    (rival) =>
      rival.status.kind === LineStatusKind.Applied &&
      rival.modifier.type === line.modifier.type &&
      (rival.value ?? 0) < 0 === value < 0 &&
      Math.abs(rival.value ?? 0) >= Math.abs(value),
  );
}

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

  test('a typed conditional line is beaten exactly when an applied line of its type and direction is as large', () => {
    assert(
      property(specs, (given) => {
        const { lines } = derive(rules(given));
        const typedConditional = lines.filter(
          ({ status, modifier }) =>
            status.kind === LineStatusKind.Conditional && modifier.type !== ModifierType.Untyped,
        );
        for (const line of typedConditional) {
          const rivals = rivalsOf(line, lines);
          const beatenBy = beatenByOf(line);
          expect(beatenBy === undefined).toBe(rivals.length === 0);
          expect(beatenBy === undefined || rivals.some(({ modifier }) => modifier.id === beatenBy)).toBe(true);
        }
      }),
    );
  });

  test('an untyped conditional line is never beaten', () => {
    assert(
      property(specs, (given) => {
        const untyped = derive(rules(given)).lines.filter(({ modifier }) => modifier.type === ModifierType.Untyped);
        expect(untyped.every((line) => beatenByOf(line) === undefined)).toBe(true);
      }),
    );
  });

  test('applying a beaten conditional line never changes the total, whatever adjustments wait on the situation', () => {
    const situation = new PredicateFacts(
      [RollOption.parse('self:effect:raise-a-shield'), RollOption.parse('terrain:forest')],
      CORE_NAMESPACES,
    );
    assert(
      property(tuple(specs, beatenPair, adjustmentSpecs), ([given, pair, adjusting]) => {
        const rulesInPlay = [...rules([...given, ...pair]), ...adjustments(adjusting)];
        const beaten = new Set(
          derive(rulesInPlay)
            .lines.filter((line) => beatenByOf(line) !== undefined)
            .map(({ modifier }) => modifier.id),
        );
        const withoutBeaten = rulesInPlay.filter((rule) => !beaten.has(ruleIdOf(rule)));
        expect(deriveIn(rulesInPlay, situation).total).toBe(deriveIn(withoutBeaten, situation).total);
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
        const added = [...given, { type, value, target: 'ac', predicate: undefined, slug: undefined }];
        expect(derive(rules(added)).total).toBeLessThanOrEqual(before);
      }),
    );
  });
});
