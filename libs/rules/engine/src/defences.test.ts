import { describe, expect, test } from 'bun:test';

import { DamageTarget } from '@pioneer/rules/dice';
import { FormulaMessage } from '@pioneer/rules/formula';
import { PredicateFacts, SummaryKind } from '@pioneer/rules/predicate';
import { DamageAmount, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';

import { DefenceStatusKind, deriveDefences } from './defences';
import type { AdjustmentLine, Defences } from './defences';
import { EngineMessage } from './messages';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay, resistance, weakness } from './testing';

const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };

const inputs = StatisticInputsJson.parse({
  level: 5,
  attributes: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
  ranks: {},
});

function facts(...options: readonly string[]): PredicateFacts {
  return new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
}

function derived(rules: readonly RuleInPlay[], known: PredicateFacts = facts()): Defences {
  return deriveDefences(content, inputs, { rules, facts: known });
}

function summary(line: AdjustmentLine | undefined): unknown {
  return line === undefined ? undefined : { type: line.type, value: line.value, status: line.status.kind };
}

/** Fire Shield's resistance, only while the spell is up: an effect the sheet knows is on or off. */
const FIRE_SHIELD = ['self:effect:fire-shield'];
/** A situation the sheet cannot know. */
const IN_FOREST = ['terrain:forest'];

describe('deriveDefences', () => {
  test('no rules, no defences', () => {
    expect(derived([])).toStrictEqual({
      immunities: [],
      weaknesses: [],
      resistances: [],
      target: { immunities: [], weaknesses: [], resistances: [] },
    });
  });

  test('an immunity applies with its origin and the label of its entry', () => {
    const rule = inPlay({ key: 'Immunity', type: 'poison' }, 'poison-immunity');
    const { immunities, target } = derived([rule]);
    const listed: unknown = immunities;
    const targeted: unknown = target.immunities;
    expect(listed).toStrictEqual([
      {
        id: ruleIdOf(rule),
        label: { entry: rule.origin.entry },
        origin: rule.origin,
        exceptions: [],
        type: 'poison',
        status: { kind: DefenceStatusKind.Applied },
      },
    ]);
    expect(targeted).toStrictEqual(['poison']);
  });

  test('two sources of the same immunity list both, and the target names it once', () => {
    const rules = [inPlay({ key: 'Immunity', type: 'fire' }, 'a'), inPlay({ key: 'Immunity', type: 'fire' }, 'b')];
    const { immunities, target } = derived(rules);
    const types: unknown = immunities.map(({ type }) => type);
    const targeted: unknown = target.immunities;
    expect(types).toStrictEqual(['fire', 'fire']);
    expect(targeted).toStrictEqual(['fire']);
  });

  test('a weakness and a resistance read their value, a formula included', () => {
    const rules = [inPlay(weakness('cold', 5), 'chill'), inPlay(resistance('fire', 'floor(@level / 2)'), 'warmth')];
    const { weaknesses, resistances, target } = derived(rules);
    expect(summary(weaknesses[0])).toStrictEqual({ type: 'cold', value: 5, status: DefenceStatusKind.Applied });
    expect(summary(resistances[0])).toStrictEqual({ type: 'fire', value: 2, status: DefenceStatusKind.Applied });
    const targeted: unknown = target;
    expect(targeted).toStrictEqual({
      immunities: [],
      weaknesses: [{ type: 'cold', value: 5 }],
      resistances: [{ type: 'fire', value: 2 }],
    });
  });

  test('a formula reads the level of the item the element is on', () => {
    const rule = inPlay(resistance('acid', '@item.level'), 'acid-ward', { itemLevel: 8 });
    const value: unknown = derived([rule]).resistances[0]?.value;
    expect(value).toBe(8);
  });

  describe('predicates', () => {
    const shield = inPlay(resistance('fire', 10, { predicate: FIRE_SHIELD }), 'fire-shield');
    const forest = inPlay(resistance('cold', 5, { predicate: IN_FOREST }), 'forest-ward');

    test('a predicate that holds applies the defence', () => {
      const { resistances, target } = derived([shield], facts('self:effect:fire-shield'));
      expect(resistances[0]?.status).toStrictEqual({ kind: DefenceStatusKind.Applied });
      const targeted: unknown = target.resistances;
      expect(targeted).toStrictEqual([{ type: 'fire', value: 10 }]);
    });

    test('a predicate the sheet cannot know makes it conditional, worded, and keeps it out of the target', () => {
      const { resistances, target } = derived([forest]);
      expect(resistances[0]?.status).toMatchObject({ kind: DefenceStatusKind.Conditional, when: IN_FOREST });
      expect(resistances[0]?.status).toMatchObject({ summary: { kind: SummaryKind.Phrase } });
      expect(target.resistances).toStrictEqual([]);
    });

    test('an authored summary words the condition', () => {
      const element = resistance('cold', 5, { predicate: IN_FOREST, display: { summary: 'in a forest' } });
      const status = derived([inPlay(element, 'forest-ward')]).resistances[0]?.status;
      expect(status).toMatchObject({ summary: { kind: SummaryKind.Authored, text: 'in a forest' } });
    });

    test('a predicate known not to hold drops the defence', () => {
      const rules = [
        inPlay({ key: 'Immunity', type: 'fire', predicate: FIRE_SHIELD }, 'a'),
        inPlay(weakness('cold', 5, { predicate: FIRE_SHIELD }), 'b'),
        inPlay(resistance('fire', 10, { predicate: FIRE_SHIELD }), 'c'),
      ];
      const { immunities, weaknesses, resistances } = derived(rules);
      expect([immunities, weaknesses, resistances]).toStrictEqual([[], [], []]);
    });

    test('a conditional immunity is listed but not in the target', () => {
      const rule = inPlay({ key: 'Immunity', type: 'paralyzed', predicate: IN_FOREST }, 'forest-stride');
      const { immunities, target } = derived([rule]);
      expect(immunities[0]?.status.kind).toBe(DefenceStatusKind.Conditional);
      expect(target.immunities).toStrictEqual([]);
    });
  });

  describe('values', () => {
    test('a fractional value rounds down', () => {
      const [line] = derived([inPlay(resistance('fire', '@level / 2'), 'a')]).resistances;
      expect(line?.value).toBe(DamageAmount.parse(2));
    });

    test('a value that rounds below 1 does nothing, so the line is dropped', () => {
      const rule = inPlay(resistance('fire', 'floor(@level / 10)'), 'a');
      expect(derived([rule]).resistances).toStrictEqual([]);
    });

    test('a formula that fails makes the line failed, pointing into the formula', () => {
      const [line] = derived([inPlay(resistance('fire', '@stat.nothing'), 'a')]).resistances;
      const status: unknown = line?.status;
      expect(line?.value).toBeUndefined();
      expect(status).toStrictEqual({
        kind: DefenceStatusKind.Failed,
        error: message(FormulaMessage.UnknownReference, { found: '@stat.nothing', position: 1 }),
        position: 1,
      });
    });

    test('a value past the largest damage amount fails as out of range', () => {
      const [line] = derived([inPlay(weakness('fire', '@level * 10000'), 'a')]).weaknesses;
      expect(line?.status).toStrictEqual({
        kind: DefenceStatusKind.Failed,
        error: message(EngineMessage.DefenceOutOfRange, { maximum: 32_767 }),
        position: undefined,
      });
    });

    test('a formula that fails to evaluate fails with the formula message', () => {
      const [line] = derived([inPlay(resistance('fire', '1 / 0'), 'a')]).resistances;
      expect(line?.status).toMatchObject({
        kind: DefenceStatusKind.Failed,
        error: { key: FormulaMessage.DivisionByZero },
      });
    });
  });

  test('exceptions travel to the target, so the dice pipeline takes it unchanged', () => {
    const rules = [
      inPlay({ key: 'Immunity', type: 'bleed' }, 'a'),
      inPlay(resistance('physical', 5, { exceptions: ['cold-iron', 'magical'] }), 'b'),
      inPlay(weakness('fire', 5), 'c'),
    ];
    const { target } = derived(rules);
    const parsed: unknown = DamageTarget.parse(target);
    expect(parsed).toStrictEqual({
      immunities: ['bleed'],
      weaknesses: [{ type: 'fire', value: 5 }],
      resistances: [{ type: 'physical', value: 5, exceptions: ['cold-iron', 'magical'] }],
    });
  });

  test('an immunity keeps its exceptions on the sheet, but the target holds only its type', () => {
    const rule = inPlay({ key: 'Immunity', type: 'fire', exceptions: ['magical'] }, 'a');
    const { immunities, target } = derived([rule]);
    const exceptions: unknown = immunities[0]?.exceptions;
    const targeted: unknown = target.immunities;
    expect(exceptions).toStrictEqual(['magical']);
    expect(targeted).toStrictEqual(['fire']);
  });

  test('other rule elements are ignored', () => {
    const rule = inPlay({ key: 'FlatModifier', selectors: ['ac'], type: 'item', value: 1 }, 'a');
    expect(derived([rule]).target).toStrictEqual({ immunities: [], weaknesses: [], resistances: [] });
  });
});
