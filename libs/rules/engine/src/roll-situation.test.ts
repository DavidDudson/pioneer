import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { LineStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { rollSituation } from './roll-situation';
import { ruleIdOf } from './rule-in-play';
import type { RuleId, RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticValue } from './statistic-result';
import { flatModifier, inPlay, statistic } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

const perception = statistic('perception', '10');

const AGAINST_UNDEAD = { predicate: ['target:trait:undead'] };
const IN_FOREST = { predicate: ['terrain:forest'] };
const KNOWN_FALSE = { predicate: ['self:effect:rage'] };

const vsUndead = inPlay({ ...flatModifier('circumstance', 1, ['perception']), ...AGAINST_UNDEAD }, 'bane');
const forest = inPlay({ ...flatModifier('status', 2, ['perception']), ...IN_FOREST }, 'ranger');
const raging = inPlay({ ...flatModifier('status', 2, ['perception']), ...KNOWN_FALSE }, 'rage');
const always = inPlay(flatModifier('item', 1, ['perception']), 'lenses');

function derived(
  rules: readonly RuleInPlay[],
  situation: readonly RuleId[] = [],
  options: readonly string[] = [],
): StatisticValue {
  const result = deriveStatistics(
    { definitions: [perception], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    inputs,
    {
      rules,
      facts: new PredicateFacts(
        options.map((option) => RollOption.parse(option)),
        CORE_NAMESPACES,
      ),
      situation: new Set(situation),
    },
  ).get(Selector.parse('perception'));
  if (result?.ok !== true) {
    throw new Error('Expected perception to derive');
  }
  return result;
}

/** The total as a plain number. */
function totalOf(value: StatisticValue): number {
  return Number(value.total);
}

describe('a situation chosen for a roll', () => {
  test('a conditional line does not count until its situation is chosen', () => {
    const waiting = derived([vsUndead, always]);
    const chosen = derived([vsUndead, always], [ruleIdOf(vsUndead)]);
    expect(totalOf(waiting)).toBe(11);
    expect(totalOf(chosen)).toBe(12);
  });

  test('a chosen line is applied, and the others stay conditional', () => {
    const value = derived([vsUndead, forest], [ruleIdOf(vsUndead)]);
    const statuses = new Map(value.lines.map(({ modifier, status }): [RuleId, string] => [modifier.id, status.kind]));
    expect(statuses.get(ruleIdOf(vsUndead))).toBe(LineStatusKind.Applied);
    expect(statuses.get(ruleIdOf(forest))).toBe(LineStatusKind.Conditional);
  });

  test('a chosen line still stacks: a better bonus of its type beats it', () => {
    const better = inPlay(flatModifier('circumstance', 3, ['perception']), 'flanking');
    const value = derived([vsUndead, better], [ruleIdOf(vsUndead)]);
    expect(totalOf(value)).toBe(13);
    const line = value.lines.find(({ modifier }) => modifier.id === ruleIdOf(vsUndead));
    expect(line?.status.kind).toBe(LineStatusKind.Suppressed);
  });

  test('a line whose predicate is known to be false stays inactive when chosen', () => {
    const value = derived([raging], [ruleIdOf(raging)], []);
    // `self:effect:rage` is a known namespace: absent means false, so there is no situation to claim.
    expect(totalOf(value)).toBe(10);
    expect(value.lines[0]?.status.kind).toBe(LineStatusKind.Inactive);
  });

  test('a chosen adjustment runs', () => {
    const double = inPlay(
      { key: 'AdjustModifier', selectors: ['perception'], mode: 'multiply', value: 2, ...IN_FOREST },
      'amplify',
    );
    const bane = [ruleIdOf(vsUndead)];
    const plain = derived([vsUndead, double], bane);
    const doubled = derived([vsUndead, double], [...bane, ruleIdOf(double)]);
    expect(totalOf(plain)).toBe(11);
    expect(totalOf(doubled)).toBe(12);
  });
});

describe('rollSituation', () => {
  test('lists the conditional lines, and every option the lines read', () => {
    const situation = rollSituation(derived([vsUndead, forest, raging, always]));
    expect(situation.conditional.map(({ modifier }) => modifier.id)).toStrictEqual([
      ruleIdOf(forest),
      ruleIdOf(vsUndead),
    ]);
    const options: string[] = [...situation.options].toSorted();
    expect(options).toStrictEqual(['self:effect:rage', 'target:trait:undead', 'terrain:forest']);
  });

  test('leaves out a conditional line an applied one already beats', () => {
    const beaten = inPlay({ ...flatModifier('circumstance', 1, ['perception']), ...AGAINST_UNDEAD }, 'bane');
    const better = inPlay(flatModifier('circumstance', 2, ['perception']), 'flanking');
    expect(rollSituation(derived([beaten, better])).conditional).toStrictEqual([]);
  });

  test('reads the options of inactive lines too, so a toggle that turns one on is found', () => {
    const situation = rollSituation(derived([raging]));
    expect(situation.options.has(RollOption.parse('self:effect:rage'))).toBe(true);
  });
});
