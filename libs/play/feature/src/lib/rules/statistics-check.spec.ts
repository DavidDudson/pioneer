import { EngineMessage, LineStatusKind } from '@pioneer/rules/engine';
import { describe, expect, it } from 'vitest';

import { EXAMPLE_FACTS } from './predicate-verdict';
import { CheckStatus, rulesExample, RulesTool } from './rules-check';
import { checkStatistics, EXAMPLE_RULE_ELEMENTS, EXAMPLE_STATISTIC_INPUTS, StatisticsStatus } from './statistics-check';
import type { StatisticsCheck, StatisticsTexts } from './statistics-check';

const statistic = (selector: string, base: string): object => ({
  slug: selector.replaceAll(':', '-'),
  name: selector,
  selector,
  domains: [],
  base,
  kind: 'check',
});

const definitions = (...statistics: readonly object[]): string => JSON.stringify(statistics);

/** The statistics tool with the example inputs and no rule elements unless given. */
function check(texts: Partial<StatisticsTexts>): StatisticsCheck {
  return checkStatistics({ definitions: '[]', inputs: EXAMPLE_STATISTIC_INPUTS, rules: '[]', facts: '', ...texts });
}

describe(checkStatistics, () => {
  it('opens on examples that all derive, in the order written', () => {
    const result = checkStatistics({
      definitions: rulesExample(RulesTool.Statistics),
      inputs: EXAMPLE_STATISTIC_INPUTS,
      rules: EXAMPLE_RULE_ELEMENTS,
      facts: EXAMPLE_FACTS,
    });
    expect(result).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          selector: 'ac',
          baseValue: 16,
          total: 19,
          lines: [
            { rule: 1, label: 'Breastplate', type: 'item', value: 4, state: { kind: LineStatusKind.Applied } },
            { rule: 2, label: 'Mage Armor', state: { kind: LineStatusKind.Suppressed, by: 1 } },
            { rule: 3, label: 'Raise a Shield', state: { kind: LineStatusKind.Inactive } },
            { rule: 4, label: 'Undergrowth', state: { kind: LineStatusKind.Conditional } },
            { rule: 5, label: 'Frightened 1', value: -1, state: { kind: LineStatusKind.Applied } },
          ],
        },
        { ok: true, selector: 'save:fortitude', total: 8 },
        { ok: true, selector: 'spell-attack:arcane', baseValue: 6, total: 5 },
        { ok: true, selector: 'spell-dc:arcane', baseValue: 16, total: 15 },
      ],
    });
  });

  it('writes each term with its sign, the first without a plus, and rounding without code', () => {
    const odd = definitions(statistic('odd', '@level / 2 - 1 + @level / 2'));
    expect(check({ definitions: odd })).toStrictEqual({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          selector: 'odd',
          baseValue: 2,
          total: 2,
          terms: [
            { code: '@level / 2', value: 1 },
            { code: '- 1', value: -1 },
            { code: '+ @level / 2', value: 1 },
            { code: undefined, value: 1 },
          ],
          lines: [],
        },
      ],
    });
  });

  it('points at the reference that closes a cycle', () => {
    const looped = definitions(statistic('a', '1 + @stat.b'), statistic('b', '@stat.a'));
    expect(check({ definitions: looped })).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        { ok: false, selector: 'a', error: { key: EngineMessage.StatisticCycle }, pointer: '1 + @stat.b\n    ^' },
        { ok: false, selector: 'b', error: { key: EngineMessage.StatisticCycle }, pointer: '@stat.a\n^' },
      ],
    });
  });

  it('reports each text that does not read', () => {
    expect(
      check({ definitions: '[', inputs: '{ "level": 99 }', rules: '[{ "key": "Nope" }]', facts: 'Bad' }),
    ).toMatchObject({
      status: StatisticsStatus.Problems,
      definitions: { status: CheckStatus.NotJson },
      inputs: { status: CheckStatus.Invalid },
      rules: { status: CheckStatus.Invalid },
      factLines: [1],
    });
  });

  it('points into a base formula that does not validate', () => {
    const itemRead = definitions(statistic('ac', '10 + @item.level'));
    expect(check({ definitions: itemRead })).toMatchObject({
      status: StatisticsStatus.Problems,
      definitions: {
        status: CheckStatus.Invalid,
        issues: [{ path: [0, 'base'], pointer: '10 + @item.level\n     ^' }],
      },
      inputs: undefined,
      rules: undefined,
      factLines: [],
    });
  });

  it('names a failed line’s error and numbers rules without a label', () => {
    const rules = JSON.stringify([{ key: 'FlatModifier', selectors: ['ac'], type: 'untyped', value: '1 / 0' }]);
    const plain = definitions(statistic('ac', '10'));
    expect(check({ definitions: plain, rules })).toMatchObject({
      rows: [{ lines: [{ rule: 1, label: undefined, value: undefined, state: { kind: LineStatusKind.Failed } }] }],
    });
  });
});
