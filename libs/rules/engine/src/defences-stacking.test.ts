import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { DefenceStatusKind, deriveDefences } from './defences';
import type { AdjustmentLine, Defences } from './defences';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay, resistance, weakness } from './testing';

const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
const inputs = StatisticInputsJson.parse({
  level: 5,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

/** A situation the sheet cannot know. */
const IN_FOREST = ['terrain:forest'];

function derived(rules: readonly RuleInPlay[]): Defences {
  return deriveDefences(content, inputs, { rules, facts: new PredicateFacts([], CORE_NAMESPACES) });
}

function statusOf(lines: readonly AdjustmentLine[], rule: RuleInPlay): unknown {
  return lines.find(({ id }) => id === ruleIdOf(rule))?.status;
}

describe('deriveDefences stacking', () => {
  test('of resistances to one type, the highest counts and supersedes the rest', () => {
    const low = inPlay(resistance('fire', 5), 'a');
    const high = inPlay(resistance('fire', 10), 'b');
    const { resistances, target } = derived([low, high]);
    expect([low, high].map((rule) => statusOf(resistances, rule))).toStrictEqual([
      { kind: DefenceStatusKind.Superseded, by: ruleIdOf(high) },
      { kind: DefenceStatusKind.Applied },
    ]);
    const targeted: unknown = target.resistances;
    expect(targeted).toStrictEqual([{ type: 'fire', value: 10 }]);
  });

  test('on a tie, the lowest id counts', () => {
    const { weaknesses } = derived([inPlay(weakness('cold', 5), 'b'), inPlay(weakness('cold', 5), 'a')]);
    const [first, second] = weaknesses;
    expect(first?.status).toStrictEqual({ kind: DefenceStatusKind.Applied });
    const superseded: unknown = second?.status;
    expect(superseded).toStrictEqual({ kind: DefenceStatusKind.Superseded, by: first?.id });
  });

  test('a group and a type in it are kept apart; the dice pipeline picks per instance', () => {
    const rules = [inPlay(resistance('physical', 5), 'a'), inPlay(resistance('slashing', 3), 'b')];
    const targeted: unknown = derived(rules).target.resistances;
    expect(targeted).toStrictEqual([
      { type: 'physical', value: 5 },
      { type: 'slashing', value: 3 },
    ]);
  });

  test('different exceptions are kept apart, since a hit may get past one and not the other', () => {
    const high = inPlay(resistance('physical', 10, { exceptions: ['adamantine'] }), 'a');
    const plain = inPlay(resistance('physical', 5), 'b');
    const low = inPlay(resistance('physical', 3, { exceptions: ['adamantine'] }), 'c');
    const { resistances } = derived([high, plain, low]);
    expect([high, plain, low].map((rule) => statusOf(resistances, rule))).toStrictEqual([
      { kind: DefenceStatusKind.Applied },
      { kind: DefenceStatusKind.Applied },
      { kind: DefenceStatusKind.Superseded, by: ruleIdOf(high) },
    ]);
  });

  test('a line covered by a higher one is superseded, though their exceptions differ', () => {
    const wide = inPlay(resistance('physical', 10), 'a');
    const narrow = inPlay(resistance('physical', 5, { exceptions: ['adamantine'] }), 'b');
    const { resistances } = derived([wide, narrow]);
    expect([wide, narrow].map((rule) => statusOf(resistances, rule))).toStrictEqual([
      { kind: DefenceStatusKind.Applied },
      { kind: DefenceStatusKind.Superseded, by: ruleIdOf(wide) },
    ]);
  });

  test('at the same value, the line with fewer exceptions covers more and counts', () => {
    const narrow = inPlay(resistance('physical', 5, { exceptions: ['silver'] }), 'a');
    const wide = inPlay(resistance('physical', 5), 'b');
    const { resistances } = derived([narrow, wide]);
    expect(statusOf(resistances, narrow)).toStrictEqual({ kind: DefenceStatusKind.Superseded, by: ruleIdOf(wide) });
  });

  test('damage types are exceptions too', () => {
    const ghost = inPlay(resistance('all', 5, { exceptions: ['force', 'spirit', 'vitality', 'ghost-touch'] }), 'ghost');
    const targeted: unknown = derived([ghost]).target.resistances;
    expect(targeted).toStrictEqual([
      { type: 'all', value: 5, exceptions: ['force', 'spirit', 'vitality', 'ghost-touch'] },
    ]);
  });

  test('a conditional one stays beside the applied one, even when higher', () => {
    const plain = inPlay(resistance('cold', 5), 'a');
    const situational = inPlay(resistance('cold', 10, { predicate: IN_FOREST }), 'b');
    const { resistances, target } = derived([plain, situational]);
    expect([plain, situational].map((rule) => statusOf(resistances, rule))).toMatchObject([
      { kind: DefenceStatusKind.Applied },
      { kind: DefenceStatusKind.Conditional },
    ]);
    const targeted: unknown = target.resistances;
    expect(targeted).toStrictEqual([{ type: 'cold', value: 5 }]);
  });

  test('weaknesses and resistances never compete with each other', () => {
    const rules = [inPlay(weakness('fire', 5), 'a'), inPlay(resistance('fire', 10), 'b')];
    const { target } = derived(rules);
    expect(target).toMatchObject({
      weaknesses: [{ type: 'fire', value: 5 }],
      resistances: [{ type: 'fire', value: 10 }],
    });
  });
});
