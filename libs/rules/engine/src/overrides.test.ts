import { describe, expect, test } from 'bun:test';

import { FormulaMessage } from '@pioneer/rules/formula';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, Selector } from '@pioneer/rules/sdk';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { OverridePhase, OverrideStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticValue } from './statistic-result';
import { change, flatModifier, inPlay, statistic } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
  ranks: { ac: 'trained' },
  dexterityCap: 1,
});

/** AC 16 before changes and modifiers. */
const ac = statistic('ac', '10 + @attr.dex.capped + @prof.ac');
const perception = statistic('perception', '@attr.wis + @stat.ac');

function derivedAll(rules: readonly RuleInPlay[], ...options: readonly string[]): ReadonlyMap<Selector, unknown> {
  const facts = new PredicateFacts(options.map((option) => RollOption.parse(option)));
  return deriveStatistics({ definitions: [ac, perception], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs, {
    rules,
    facts,
  });
}

function derived(rules: readonly RuleInPlay[], ...options: readonly string[]): StatisticValue {
  const result = derivedAll(rules, ...options).get(Selector.parse('ac'));
  if (typeof result !== 'object' || result === null || !('ok' in result) || result.ok !== true) {
    throw new Error('Expected AC to derive');
  }
  return result as StatisticValue;
}

describe('Change in the base phase', () => {
  test('changes run in mode order, then priority, each recording the value it replaced', () => {
    const override = inPlay(change('ac', 'override', 12), 'override');
    const upgrade = inPlay(change('ac', 'upgrade', 20), 'upgrade');
    const multiply = inPlay(change('ac', 'multiply', 2), 'multiply');
    const addLate = inPlay({ ...change('ac', 'add', 1), priority: 50 }, 'add-late');
    const addEarly = inPlay({ ...change('ac', 'add', 2), priority: 10 }, 'add-early');
    const value = derived([override, upgrade, multiply, addLate, addEarly]);
    expect(value.overrides).toMatchObject([
      { id: ruleIdOf(addEarly), replaced: 16, result: 18 },
      { id: ruleIdOf(addLate), replaced: 18, result: 19 },
      { id: ruleIdOf(multiply), replaced: 19, result: 38 },
      { id: ruleIdOf(upgrade), replaced: 38, result: 38 },
      { id: ruleIdOf(override), replaced: 38, result: 12 },
    ]);
    expect(value).toMatchObject({ formulaValue: 16, baseValue: 12, computed: 12, total: 12, pinnedBy: undefined });
  });

  test('a changed base is what modifiers add to and what @stat reads', () => {
    const rules = [inPlay(change('ac', 'add', 2), 'add'), inPlay(flatModifier('item', 1, ['ac']), 'armor')];
    expect(derived(rules)).toMatchObject({ baseValue: 18, total: 19 });
    expect(derivedAll(rules).get(Selector.parse('perception'))).toMatchObject({ total: 19 });
  });

  test('a change that does not hold, depends on the situation or fails leaves the value as it was', () => {
    const inactive = inPlay({ ...change('ac', 'add', 1), predicate: ['self:effect:rage'] }, 'inactive');
    const conditional = inPlay({ ...change('ac', 'add', 1), predicate: ['terrain:forest'] }, 'conditional');
    const broken = inPlay(change('ac', 'add', '1 / 0'), 'broken');
    const value = derived([inactive, conditional, broken]);
    expect(value.overrides.map(({ status }) => status.kind).toSorted()).toStrictEqual([
      OverrideStatusKind.Conditional,
      OverrideStatusKind.Failed,
      OverrideStatusKind.Inactive,
    ]);
    expect(value.overrides.find(({ id }) => id === ruleIdOf(broken))?.status).toMatchObject({
      error: { key: FormulaMessage.DivisionByZero },
    });
    expect(value).toMatchObject({ baseValue: 16 });
  });

  test('a change on an item reads @item.level, and @stat is not available to it', () => {
    const potency = inPlay(change('ac', 'add', '@item.level'), 'potency', { itemLevel: 2 });
    const reading = inPlay(change('ac', 'add', '@stat.perception'), 'reading');
    const value = derived([potency, reading]);
    expect(value).toMatchObject({ baseValue: 18 });
    expect(value.overrides.find(({ id }) => id === ruleIdOf(reading))?.status).toMatchObject({
      kind: OverrideStatusKind.Failed,
      error: { key: FormulaMessage.UnknownReference },
    });
  });
});

describe('overrides', () => {
  test('an adjust override is a modifier with an override origin, and stacks like any other', () => {
    const blessing = inPlay(flatModifier('status', 1, ['ac']), 'gm-blessing', { override: true });
    const better = inPlay(flatModifier('status', 2, ['ac']), 'heroism');
    const value = derived([blessing, better]);
    expect(value.lines.find(({ modifier }) => modifier.id === ruleIdOf(blessing))).toMatchObject({
      modifier: { origin: { hops: [{ kind: 'override' }] } },
      status: { kind: 'suppressed', by: ruleIdOf(better) },
    });
    expect(value).toMatchObject({ total: 18, pinnedBy: undefined });
  });

  test('a set override pins the total and keeps the computed value', () => {
    const pin = inPlay(change('ac', 'override', 25), 'pin', { override: true });
    const armor = inPlay(flatModifier('item', 4, ['ac']), 'armor');
    const value = derived([pin, armor]);
    expect(value).toMatchObject({ baseValue: 16, computed: 20, total: 25, pinnedBy: ruleIdOf(pin) });
    expect(value.overrides).toMatchObject([
      { id: ruleIdOf(pin), phase: OverridePhase.Total, replaced: 20, result: 25, status: { kind: 'applied' } },
    ]);
  });

  test('of several set overrides the last by priority, then id, wins and the others are replaced', () => {
    const early = inPlay({ ...change('ac', 'override', 30), priority: 10 }, 'early', { override: true });
    const late = inPlay({ ...change('ac', 'override', 22), priority: 90 }, 'late', { override: true });
    const value = derived([late, early]);
    expect(value).toMatchObject({ total: 22, pinnedBy: ruleIdOf(late) });
    expect(value.overrides).toMatchObject([
      { id: ruleIdOf(early), result: 16, status: { kind: OverrideStatusKind.Replaced, by: ruleIdOf(late) } },
      { id: ruleIdOf(late), result: 22, status: { kind: OverrideStatusKind.Applied } },
    ]);
  });

  test('a set override pins the total, not the base other statistics read', () => {
    const pin = inPlay(change('ac', 'override', 25), 'pin', { override: true });
    expect(derivedAll([pin]).get(Selector.parse('perception'))).toMatchObject({ total: 17 });
  });
});
