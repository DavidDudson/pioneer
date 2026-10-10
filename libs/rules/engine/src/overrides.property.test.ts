import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ModifierType, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, property, record, tuple } from 'fast-check';

import { LineStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { change, flatModifier, inPlay, statistic } from './testing';

const VALUE_MAX = 5;
const PINNED_MAX = 40;
const PRIORITY_MAX = 200;
const RULES_MAX = 6;

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const ac = statistic('ac', '10');
const facts = new PredicateFacts([], CORE_NAMESPACES);
const TYPES = Object.values(ModifierType).filter((type) => type !== ModifierType.Attribute);

const modifiers = array(record({ type: constantFrom(...TYPES), value: integer({ min: -VALUE_MAX, max: VALUE_MAX }) }), {
  maxLength: RULES_MAX,
}).map((specs) =>
  specs.map(({ type, value }, index) => inPlay(flatModifier(type, value, ['ac']), `modifier-${index}`)),
);

const pins = array(
  record({ value: integer({ min: 0, max: PINNED_MAX }), priority: integer({ min: 0, max: PRIORITY_MAX }) }),
  { minLength: 1, maxLength: RULES_MAX },
).map((specs) =>
  specs.map(({ value, priority }, index) =>
    inPlay({ ...change('ac', 'override', value), priority }, `pin-${index}`, { override: true }),
  ),
);

function derive(rules: readonly RuleInPlay[]): StatisticResult | undefined {
  return deriveStatistics({ definitions: [ac], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs, {
    rules,
    facts,
  }).get(Selector.parse('ac'));
}

/** A test rule's priority; every pin sets one. */
function priorityOf(rule: RuleInPlay): number {
  return rule.element.priority ?? 0;
}

/** The set override that should win: the last by priority, then id. */
function lastPin(pinRules: readonly RuleInPlay[]): RuleInPlay | undefined {
  return pinRules
    .toSorted((left, right) => priorityOf(left) - priorityOf(right) || (ruleIdOf(left) < ruleIdOf(right) ? -1 : 1))
    .at(-1);
}

describe('overrides (properties)', () => {
  test('a set override always wins, and the computed value is still reported', () => {
    assert(
      property(tuple(modifiers, pins), ([modifierRules, pinRules]) => {
        const pinned = derive([...modifierRules, ...pinRules]);
        const unpinned = derive(modifierRules);
        const winner = lastPin(pinRules);
        const expected = winner?.element.key === 'Change' ? winner.element.value : undefined;
        expect(pinned).toMatchObject({
          total: expected,
          pinnedBy: winner === undefined ? undefined : ruleIdOf(winner),
        });
        expect(pinned).toMatchObject({ computed: unpinned?.ok === true ? unpinned.total : undefined });
        const applied =
          pinned?.ok === true ? pinned.lines.filter((line) => line.status.kind === LineStatusKind.Applied) : [];
        const sum = applied.reduce((total, line) => total + (line.value ?? 0), 0);
        expect(pinned).toMatchObject({ computed: 10 + sum });
      }),
    );
  });
});
