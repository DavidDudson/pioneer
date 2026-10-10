import { describe, expect, test } from 'bun:test';

import { FormulaMessage } from '@pioneer/rules/formula';
import { Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';

import { BaseTermKind, TermSign } from './base-term';
import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';

function statistic(selector: string, base: string): StatisticDefinition {
  return StatisticDefinition.parse({
    slug: selector.replaceAll(':', '-'),
    name: selector,
    selector,
    domains: [],
    base,
    kind: StatisticKind.Check,
  });
}

/** A level 3 fighter in a breastplate (Dexterity cap +1): trained in AC, expert in Fortitude. */
const fighter: StatisticInputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
  ranks: { ac: 'trained', 'save:fortitude': 'expert', 'spell-attack:arcane': 'trained' },
  dexterityCap: 1,
});

function derive(...definitions: readonly StatisticDefinition[]): ReadonlyMap<Selector, StatisticResult> {
  return deriveStatistics({ definitions, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, fighter);
}

function resultOf(results: ReadonlyMap<Selector, StatisticResult>, selector: string): StatisticResult | undefined {
  return results.get(Selector.parse(selector));
}

/** The result of a statistic derived on its own. */
function alone(selector: string, base: string): StatisticResult | undefined {
  return resultOf(derive(statistic(selector, base)), selector);
}

describe('deriveStatistics', () => {
  test('evaluates the base with one term per top-level term of the formula', () => {
    const ac = alone('ac', '10 + @attr.dex.capped + @prof.ac');
    expect(ac).toStrictEqual({
      ok: true,
      selector: 'ac',
      formulaValue: 16,
      baseValue: 16,
      lines: [],
      computed: 16,
      total: 16,
      overrides: [],
      pinnedBy: undefined,
      base: [
        { kind: BaseTermKind.Term, formula: '10', sign: TermSign.Plus, value: 10, position: 1, origin: undefined },
        {
          kind: BaseTermKind.Term,
          formula: '@attr.dex.capped',
          sign: TermSign.Plus,
          value: 1,
          position: 6,
          origin: undefined,
        },
        {
          kind: BaseTermKind.Term,
          formula: '@prof.ac',
          sign: TermSign.Plus,
          value: 5,
          position: 25,
          origin: undefined,
        },
      ],
    } as unknown as StatisticResult);
  });

  test('reads inputs: attributes, ranks, proficiency bonus and an untrained selector', () => {
    const results = derive(
      statistic('save:fortitude', '@attr.con + @prof.save.fortitude'),
      statistic('skill:arcana', '@attr.int + @prof.skill.arcana + @rank.skill.arcana'),
      statistic('rank-check', '@rank.save.fortitude * 10 + @level'),
    );
    expect(resultOf(results, 'save:fortitude')).toMatchObject({ ok: true, total: 9 });
    expect(resultOf(results, 'skill:arcana')).toMatchObject({ ok: true, total: 0 });
    expect(resultOf(results, 'rank-check')).toMatchObject({ ok: true, total: 23 });
  });

  test('a subtracted term keeps its sign, and a bracketed sum stays one term', () => {
    const result = alone('odd', '@level - (@attr.str + 1) * 2');
    expect(result).toMatchObject({
      ok: true,
      total: -7,
      base: [
        { formula: '@level', sign: TermSign.Plus, value: 3, position: 1 },
        { formula: '(@attr.str + 1) * 2', sign: TermSign.Minus, value: -10, position: 11 },
      ],
    });
  });

  test('terms that round apart from the total get a rounding line', () => {
    const result = alone('half', '@level / 2 + @level / 2');
    expect(result).toMatchObject({
      ok: true,
      total: 3,
      base: [{ value: 1 }, { value: 1 }, { kind: BaseTermKind.Rounding, value: 1 }],
    });
  });

  test('a statistic reads another statistic’s total, whatever order they are given in', () => {
    const results = derive(
      statistic('spell-dc:arcane', '10 + @stat.spell-attack.arcane'),
      statistic('spell-attack:arcane', '@attr.int + @prof.spell-attack.arcane'),
    );
    expect(resultOf(results, 'spell-attack:arcane')).toMatchObject({ ok: true, total: 5 });
    expect(resultOf(results, 'spell-dc:arcane')).toMatchObject({ ok: true, total: 15 });
  });

  test('a cycle names every statistic in it and points at each one’s reference into it', () => {
    const results = derive(
      statistic('a', '@stat.b + 1'),
      statistic('b', '2 + @stat.c'),
      statistic('c', '@level + @stat.a'),
      statistic('d', '@stat.a'),
      statistic('e', '@level'),
    );
    const statistics = 'a, b, c';
    expect(resultOf(results, 'a')).toStrictEqual({
      ok: false,
      selector: 'a',
      error: message(EngineMessage.StatisticCycle, { found: '@stat.b', position: 1, statistics, count: 3 }),
      position: 1,
    } as unknown as StatisticResult);
    expect(resultOf(results, 'b')).toMatchObject({ error: { params: { found: '@stat.c', position: 5, statistics } } });
    expect(resultOf(results, 'c')).toMatchObject({ error: { params: { found: '@stat.a', position: 10, statistics } } });
    expect(resultOf(results, 'd')).toMatchObject({
      ok: false,
      error: message(EngineMessage.FailedDependency, { found: '@stat.a', position: 1, selector: 'a' }),
    });
    expect(resultOf(results, 'e')).toMatchObject({ ok: true, total: 3 });
  });

  test('a statistic that reads itself is a cycle of one', () => {
    expect(alone('ac', '10 + @stat.ac')).toMatchObject({
      ok: false,
      error: message(EngineMessage.StatisticCycle, { found: '@stat.ac', position: 6, statistics: 'ac', count: 1 }),
      position: 6,
    });
  });

  test('a reference to a missing statistic is an error at the reference', () => {
    expect(alone('spell-dc', '10 + @stat.spell-attack')).toMatchObject({
      ok: false,
      error: message(EngineMessage.MissingStatistic, {
        found: '@stat.spell-attack',
        position: 6,
        selector: 'spell-attack',
      }),
      position: 6,
    });
  });

  test('a reference to an ancestry or class not chosen yet is an error at the reference', () => {
    expect(alone('speed:land', '@ancestry.speed')).toMatchObject({
      ok: false,
      error: message(EngineMessage.NoAncestry, { found: '@ancestry.speed', position: 1 }),
      position: 1,
    });
    expect(alone('class-dc', '10 + @attr.key + @prof.class-dc')).toMatchObject({
      ok: false,
      error: message(EngineMessage.NoClass, { found: '@attr.key', position: 6 }),
      position: 6,
    });
  });

  test('an ancestry reference in a ternary branch not taken is never read', () => {
    expect(alone('speed:land', 'ternary(0, @ancestry.speed, 25)')).toMatchObject({ ok: true, total: 25 });
  });

  test('a formula that fails to evaluate is that statistic’s error, and the rest evaluate', () => {
    const results = derive(statistic('broken', '@level / (@attr.int)'), statistic('perception', '@attr.wis'));
    expect(resultOf(results, 'broken')).toMatchObject({
      ok: false,
      error: { key: FormulaMessage.DivisionByZero },
      position: 8,
    });
    expect(resultOf(results, 'perception')).toMatchObject({ ok: true, total: 1 });
  });

  test('an item reference has no value here', () => {
    const definition = { ...statistic('item', '@level'), base: '@item.level' } as StatisticDefinition;
    expect(resultOf(derive(definition), 'item')).toMatchObject({
      ok: false,
      error: { key: FormulaMessage.UnknownReference },
    });
  });

  test('a later definition of a selector replaces an earlier one', () => {
    const results = derive(statistic('ac', '10'), statistic('ac', '12'));
    expect([...results.values()]).toMatchObject([{ selector: 'ac', total: 12 }]);
  });

  test('without a Dexterity cap, capped Dexterity is the modifier', () => {
    const uncapped: StatisticInputs = { level: fighter.level, attributes: fighter.attributes, ranks: fighter.ranks };
    const results = deriveStatistics(
      { definitions: [statistic('ac', '@attr.dex.capped')], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
      uncapped,
    );
    expect(resultOf(results, 'ac')).toMatchObject({ ok: true, total: 2 });
  });
});
