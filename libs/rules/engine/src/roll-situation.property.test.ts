import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ModifierType, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, integer, property, record } from 'fast-check';

import { LineStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { rollSituation } from './roll-situation';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticValue } from './statistic-result';
import { flatModifier, inPlay, statistic } from './testing';

const VALUE_MAX = 5;
const MODIFIERS_MAX = 8;

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const perception = statistic('perception', '10');
const facts = new PredicateFacts([], CORE_NAMESPACES);

/** No predicate, three that depend on the situation, and one in a known namespace, so false with nothing set. */
const KNOWN_FALSE = ['self:effect:rage'];
const PREDICATES = [
  undefined,
  ['terrain:forest'],
  ['target:trait:undead'],
  ['action:seek', 'lighting:dim'],
  KNOWN_FALSE,
];

interface Spec {
  readonly type: string;
  readonly value: number;
  readonly predicate: readonly string[] | undefined;
  /** Whether the roll chose this modifier's situation. */
  readonly chosen: boolean;
}

const spec = record({
  type: constantFrom(...Object.values(ModifierType).filter((type) => type !== ModifierType.Attribute)),
  value: integer({ min: -VALUE_MAX, max: VALUE_MAX }),
  predicate: constantFrom(...PREDICATES),
  chosen: boolean(),
});
const scenario = array(spec, { maxLength: MODIFIERS_MAX });

function rulesOf(specs: readonly Spec[]): RuleInPlay[] {
  return specs.map(({ type, value, predicate }, index) =>
    inPlay(
      { ...flatModifier(type, value, ['perception']), ...(predicate === undefined ? {} : { predicate }) },
      `modifier-${index}`,
    ),
  );
}

function derived(rules: readonly RuleInPlay[], situation: ReadonlySet<RuleId>): StatisticValue {
  const result = deriveStatistics(
    { definitions: [perception], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    inputs,
    { rules, facts, situation },
  ).get(Selector.parse('perception'));
  if (result?.ok !== true) {
    throw new Error('Expected perception to derive');
  }
  return result;
}

function chosenIn(specs: readonly Spec[], rules: readonly RuleInPlay[]): ReadonlySet<RuleId> {
  return new Set(rules.filter((_rule, index) => specs[index]?.chosen === true).map((rule) => ruleIdOf(rule)));
}

describe('the breakdown of a roll with any toggles chosen', () => {
  test('the total is the base plus the applied lines', () => {
    assert(
      property(scenario, (specs) => {
        const rules = rulesOf(specs);
        const value = derived(rules, chosenIn(specs, rules));
        const applied = value.lines
          .filter(({ status }) => status.kind === LineStatusKind.Applied)
          .reduce((sum, { value: line }) => sum + (line ?? 0), 0);
        expect(Number(value.total)).toBe(Number(value.baseValue) + applied);
      }),
    );
  });

  test('a chosen situation counts as if the modifier had no predicate; a known-false one still does not', () => {
    assert(
      property(scenario, (specs) => {
        const rules = rulesOf(specs);
        const value = derived(rules, chosenIn(specs, rules));
        const claimed = specs.map((each) =>
          each.chosen && each.predicate !== KNOWN_FALSE ? { ...each, predicate: undefined } : each,
        );
        const unconditional = derived(rulesOf(claimed), new Set());
        expect(Number(value.total)).toBe(Number(unconditional.total));
      }),
    );
  });

  test('a line left out of the choice never counts, and the lines offered are exactly the conditional ones', () => {
    assert(
      property(scenario, (specs) => {
        const rules = rulesOf(specs);
        const baseline = derived(rules, new Set());
        const offered = new Set(rollSituation(baseline).conditional.map(({ modifier }) => modifier.id));
        const value = derived(rules, chosenIn(specs, rules));
        for (const { modifier, status } of baseline.lines) {
          const now = value.lines.find((line) => line.modifier.id === modifier.id)?.status.kind;
          if (status.kind === LineStatusKind.Conditional && !chosenIn(specs, rules).has(modifier.id)) {
            expect(now).toBe(LineStatusKind.Conditional);
          }
          if (offered.has(modifier.id)) {
            expect(status.kind).toBe(LineStatusKind.Conditional);
          }
        }
      }),
    );
  });
});
