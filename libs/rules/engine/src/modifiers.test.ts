import { describe, expect, test } from 'bun:test';

import { FormulaMessage } from '@pioneer/rules/formula';
import { PredicateFacts, SummaryKind } from '@pioneer/rules/predicate';
import { RollOption, Selector } from '@pioneer/rules/sdk';
import type { StatisticDefinition } from '@pioneer/rules/sdk';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { InactiveReason, LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticValue } from './statistic-result';
import { flatModifier, inPlay, statistic } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
  ranks: { ac: 'trained' },
  dexterityCap: 1,
});

/** AC 16 before modifiers. */
const ac = statistic('ac', '10 + @attr.dex.capped + @prof.ac', ['dex-based']);

function facts(...options: readonly string[]): PredicateFacts {
  return new PredicateFacts(options.map((option) => RollOption.parse(option)));
}

function derived(
  rules: readonly RuleInPlay[],
  known: PredicateFacts = facts(),
  definition: StatisticDefinition = ac,
): StatisticValue {
  const result = deriveStatistics(
    { definitions: [definition], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    inputs,
    { rules, facts: known },
  ).get(Selector.parse(definition.selector));
  if (result?.ok !== true) {
    throw new Error(`Expected ${definition.selector} to derive`);
  }
  return result;
}

function lineOf(value: StatisticValue, rule: RuleInPlay): BreakdownLine | undefined {
  return value.lines.find((line) => line.modifier.id === ruleIdOf(rule));
}

/** The two rules, the one with the smaller id first. */
function byId(first: RuleInPlay, second: RuleInPlay): readonly [RuleInPlay, RuleInPlay] {
  return ruleIdOf(first) < ruleIdOf(second) ? [first, second] : [second, first];
}

/** An `AdjustModifier` on AC for the modifier with slug `cover`. */
function adjust(fields: Readonly<Record<string, unknown>>, entry: string): RuleInPlay {
  return inPlay({ key: 'AdjustModifier', selectors: ['ac'], slug: 'cover', ...fields }, entry);
}

describe('modifiers', () => {
  test('the AC stack: item bonus, conditional shield, frightened, a suppressed status bonus, untyped bonuses', () => {
    const armor = inPlay(flatModifier('item', 1, ['ac']), 'breastplate');
    const shield = inPlay({ ...flatModifier('circumstance', 2, ['ac']), predicate: ['terrain:forest'] }, 'shield');
    const frightened = inPlay(flatModifier('status', -1, ['all']), 'frightened');
    const lowerStatus = inPlay(flatModifier('status', 1, ['ac']), 'bless');
    const higherStatus = inPlay(flatModifier('status', 2, ['dex-based']), 'heroism');
    const untypedA = inPlay(flatModifier('untyped', 1, ['ac']), 'untyped-a');
    const untypedB = inPlay(flatModifier('untyped', 1, ['ac']), 'untyped-b');
    const value = derived([armor, shield, frightened, lowerStatus, higherStatus, untypedA, untypedB]);

    expect(value).toMatchObject({ baseValue: 16 });
    expect(lineOf(value, armor)?.status).toStrictEqual({ kind: LineStatusKind.Applied });
    expect(lineOf(value, shield)?.status).toMatchObject({
      kind: LineStatusKind.Conditional,
      when: ['terrain:forest'],
      summary: { kind: SummaryKind.Phrase },
    });
    expect(lineOf(value, frightened)).toMatchObject({ value: -1, status: { kind: LineStatusKind.Applied } });
    expect(lineOf(value, lowerStatus)?.status).toStrictEqual({
      kind: LineStatusKind.Suppressed,
      by: ruleIdOf(higherStatus),
      reason: SuppressionReason.Stacking,
    });
    expect(lineOf(value, higherStatus)?.status).toStrictEqual({ kind: LineStatusKind.Applied });
    expect(lineOf(value, untypedA)?.status.kind).toBe(LineStatusKind.Applied);
    expect(lineOf(value, untypedB)?.status.kind).toBe(LineStatusKind.Applied);
    // 16 + 1 item + 2 status - 1 status + 1 + 1 untyped.
    expect(value).toMatchObject({ total: 20 });
  });

  test('a modifier reaches a statistic through its selector, a domain or all, and no other way', () => {
    const rules = [
      inPlay(flatModifier('untyped', 1, ['ac']), 'by-selector'),
      inPlay(flatModifier('untyped', 1, ['dex-based']), 'by-domain'),
      inPlay(flatModifier('untyped', 1, ['all']), 'everything'),
      inPlay(flatModifier('untyped', 1, ['skill-check', 'perception']), 'elsewhere'),
    ];
    expect(derived(rules).lines).toHaveLength(3);
    expect(derived(rules)).toMatchObject({ total: 19 });
  });

  test('a known false predicate is inactive', () => {
    const raised = inPlay(
      { ...flatModifier('circumstance', 2, ['ac']), predicate: ['self:effect:raise-a-shield'] },
      'x',
    );
    expect(lineOf(derived([raised]), raised)?.status).toStrictEqual({
      kind: LineStatusKind.Inactive,
      reason: InactiveReason.Predicate,
    });
    const raisedUp = derived([raised], facts('self:effect:raise-a-shield'));
    expect(lineOf(raisedUp, raised)?.status.kind).toBe(LineStatusKind.Applied);
  });

  test('a formula value reads the inputs and the item level; a failure is a line, not an exception', () => {
    const potency = inPlay(flatModifier('item', 'floor(@item.level / 2)', ['ac']), 'potency', { itemLevel: 5 });
    const broken = inPlay(flatModifier('untyped', '@level / (@attr.int)', ['ac']), 'broken');
    const value = derived([potency, broken]);
    expect(lineOf(value, potency)).toMatchObject({ value: 2, status: { kind: LineStatusKind.Applied } });
    expect(lineOf(value, broken)).toMatchObject({
      value: undefined,
      status: { kind: LineStatusKind.Failed, error: { key: FormulaMessage.DivisionByZero }, position: 8 },
    });
    expect(value).toMatchObject({ total: 18 });
  });

  test('typed penalties: the worst applies; a bonus and a penalty of one type both apply', () => {
    const minusOne = inPlay(flatModifier('status', -1, ['ac']), 'minus-one');
    const minusTwo = inPlay(flatModifier('status', -2, ['ac']), 'minus-two');
    const plusOne = inPlay(flatModifier('status', 1, ['ac']), 'plus-one');
    const value = derived([minusOne, minusTwo, plusOne]);
    expect(lineOf(value, minusOne)?.status).toMatchObject({ kind: LineStatusKind.Suppressed, by: ruleIdOf(minusTwo) });
    expect(value).toMatchObject({ total: 15 });
  });

  test('equal typed bonuses tie-break on the id', () => {
    const first = inPlay(flatModifier('item', 1, ['ac']), 'one');
    const second = inPlay(flatModifier('item', 1, ['ac']), 'two');
    const [winner, loser] = byId(first, second);
    const value = derived([second, first]);
    expect(lineOf(value, winner)?.status.kind).toBe(LineStatusKind.Applied);
    expect(lineOf(value, loser)?.status).toMatchObject({ kind: LineStatusKind.Suppressed, by: ruleIdOf(winner) });
  });
});

describe('AdjustModifier', () => {
  const sneaky = inPlay({ ...flatModifier('circumstance', 3, ['ac']), slug: 'cover' }, 'cover');
  const other = inPlay(flatModifier('untyped', 1, ['ac']), 'other');

  test.each([
    ['add', 1, 4],
    ['subtract', 1, 2],
    ['multiply', 0.5, 1],
    ['upgrade', 4, 4],
    ['upgrade', 2, 3],
    ['downgrade', 2, 2],
    ['override', 0, 0],
  ] as const)('%s %d changes only the slugged modifier', (mode, change, expected) => {
    const adjustment = adjust({ mode, value: change }, 'adjust');
    const value = derived([sneaky, other, adjustment]);
    expect(lineOf(value, sneaky)).toMatchObject({ value: expected, adjustedBy: [ruleIdOf(adjustment)] });
    expect(lineOf(value, other)).toMatchObject({ value: 1, adjustedBy: [] });
  });

  test('adjustments run by priority, then id', () => {
    const doubleFirst = adjust({ mode: 'multiply', value: 2, priority: 10 }, 'double');
    const addSecond = adjust({ mode: 'add', value: 1, priority: 20 }, 'add-one');
    expect(lineOf(derived([addSecond, sneaky, doubleFirst]), sneaky)).toMatchObject({ value: 7 });
  });

  test('suppress removes the modifier, naming the adjustment', () => {
    const suppress = adjust({ suppress: true }, 'suppress');
    expect(lineOf(derived([sneaky, suppress]), sneaky)?.status).toStrictEqual({
      kind: LineStatusKind.Suppressed,
      by: ruleIdOf(suppress),
      reason: SuppressionReason.Adjustment,
    });
  });

  test('an adjustment runs only while its predicate is known to hold', () => {
    const situational = adjust({ mode: 'add', value: 1, predicate: ['terrain:forest'] }, 'forest');
    expect(lineOf(derived([sneaky, situational]), sneaky)).toMatchObject({ value: 3 });
    const inForest = derived([sneaky, situational], facts('terrain:forest'));
    expect(lineOf(inForest, sneaky)).toMatchObject({ value: 4 });
  });

  test('a failing adjustment formula fails the line', () => {
    const broken = adjust({ mode: 'add', value: '1 / 0' }, 'broken');
    expect(lineOf(derived([sneaky, broken]), sneaky)).toMatchObject({
      value: undefined,
      status: { kind: LineStatusKind.Failed, error: { key: FormulaMessage.DivisionByZero } },
    });
  });
});

describe('@stat in modifier formulas', () => {
  test('reads another statistic’s base, before its modifiers', () => {
    const perception = statistic('perception', '@attr.wis + 2');
    const fromPerception = inPlay(flatModifier('untyped', '@stat.perception', ['ac']), 'reads-perception');
    const perceptionBonus = inPlay(flatModifier('untyped', 5, ['perception']), 'perception-bonus');
    const results = deriveStatistics(
      { definitions: [ac, perception], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
      inputs,
      {
        rules: [fromPerception, perceptionBonus],
        facts: facts(),
      },
    );
    expect(results.get(Selector.parse('perception'))).toMatchObject({ baseValue: 3, total: 8 });
    expect(results.get(Selector.parse('ac'))).toMatchObject({ total: 19 });
  });
});
