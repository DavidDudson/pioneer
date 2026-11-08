import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Dc, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { DefenceStatusKind, deriveDefences } from './defences';
import type { CriticalHitCheckLine } from './defences';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 12,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);

const FORTIFICATION_DC = Dc.parse(17);
const GREATER_FORTIFICATION_DC = Dc.parse(14);

function check(fields: object = {}): object {
  return { key: 'CriticalHitCheck', selectors: ['ac'], dc: FORTIFICATION_DC, ...fields };
}

function checks(rules: readonly RuleInPlay[]): readonly CriticalHitCheckLine[] {
  return deriveDefences(content, inputs, { rules, facts }).criticalHitChecks;
}

describe('CriticalHitCheck', () => {
  test('a check aimed at AC is a line with its DC, origin and label', () => {
    const rule = inPlay(check(), 'fortification');

    expect(checks([rule])).toStrictEqual([
      {
        id: ruleIdOf(rule),
        label: { entry: rule.origin.entry },
        origin: rule.origin,
        dc: FORTIFICATION_DC,
        status: { kind: DefenceStatusKind.Applied },
      },
    ]);
  });

  test('a check aimed at another statistic is not a defence line', () => {
    const elsewhere = inPlay(check({ selectors: ['save:reflex'] }), 'elsewhere');

    expect(checks([elsewhere])).toStrictEqual([]);
  });

  test('each grade keeps its own DC', () => {
    const lines = checks([
      inPlay(check({ dc: GREATER_FORTIFICATION_DC }), 'fortification-greater'),
      inPlay(check(), 'fortification'),
    ]);

    expect(lines.map(({ dc }) => dc).toSorted((left, right) => left - right)).toStrictEqual([
      GREATER_FORTIFICATION_DC,
      FORTIFICATION_DC,
    ]);
  });

  test('a predicate that holds applies the check, one that fails drops it, an unknown one makes it conditional', () => {
    const holds = inPlay(check({ predicate: ['self:effect:rage'] }), 'holds');
    const fails = inPlay(check({ predicate: ['self:effect:fly'] }), 'fails');
    const unknown = inPlay(check({ predicate: ['terrain:forest'] }), 'unknown');

    const kinds = new Map(checks([holds, fails, unknown]).map(({ id, status }) => [id, status.kind]));

    expect(kinds.get(ruleIdOf(holds))).toBe(DefenceStatusKind.Applied);
    expect(kinds.has(ruleIdOf(fails))).toBe(false);
    expect(kinds.get(ruleIdOf(unknown))).toBe(DefenceStatusKind.Conditional);
  });
});
