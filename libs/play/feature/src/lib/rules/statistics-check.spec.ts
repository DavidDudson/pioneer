import { EngineMessage } from '@pioneer/rules/engine';
import { describe, expect, it } from 'vitest';

import { CheckStatus, rulesExample, RulesTool } from './rules-check';
import { checkStatistics, EXAMPLE_STATISTIC_INPUTS, StatisticsStatus } from './statistics-check';

const statistic = (selector: string, base: string): object => ({
  slug: selector.replaceAll(':', '-'),
  name: selector,
  selector,
  domains: [],
  base,
  kind: 'check',
});

const definitions = (...statistics: readonly object[]): string => JSON.stringify(statistics);

describe(checkStatistics, () => {
  it('opens on examples that all derive, in the order written', () => {
    const check = checkStatistics(rulesExample(RulesTool.Statistics), EXAMPLE_STATISTIC_INPUTS);
    expect(check).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        { ok: true, selector: 'ac', total: 16 },
        { ok: true, selector: 'save:fortitude', total: 9 },
        { ok: true, selector: 'spell-attack:arcane', total: 6 },
        { ok: true, selector: 'spell-dc:arcane', total: 16 },
      ],
    });
  });

  it('writes each term with its sign, the first without a plus, and rounding without code', () => {
    const check = checkStatistics(
      definitions(statistic('odd', '@level / 2 - 1 + @level / 2')),
      EXAMPLE_STATISTIC_INPUTS,
    );
    expect(check).toStrictEqual({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          selector: 'odd',
          total: 2,
          terms: [
            { code: '@level / 2', value: 1 },
            { code: '- 1', value: -1 },
            { code: '+ @level / 2', value: 1 },
            { code: undefined, value: 1 },
          ],
        },
      ],
    });
  });

  it('points at the reference that closes a cycle', () => {
    const check = checkStatistics(
      definitions(statistic('a', '1 + @stat.b'), statistic('b', '@stat.a')),
      EXAMPLE_STATISTIC_INPUTS,
    );
    expect(check).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        { ok: false, selector: 'a', error: { key: EngineMessage.StatisticCycle }, pointer: '1 + @stat.b\n    ^' },
        { ok: false, selector: 'b', error: { key: EngineMessage.StatisticCycle }, pointer: '@stat.a\n^' },
      ],
    });
  });

  it('reports problems with the definitions and the inputs separately', () => {
    const check = checkStatistics('[', '{ "level": 99 }');
    expect(check).toMatchObject({
      status: StatisticsStatus.Problems,
      definitions: { status: CheckStatus.NotJson },
      inputs: { status: CheckStatus.Invalid },
    });
  });

  it('points into a base formula that does not validate', () => {
    const check = checkStatistics(definitions(statistic('ac', '10 + @item.level')), EXAMPLE_STATISTIC_INPUTS);
    expect(check).toMatchObject({
      status: StatisticsStatus.Problems,
      definitions: {
        status: CheckStatus.Invalid,
        issues: [{ path: [0, 'base'], pointer: '10 + @item.level\n     ^' }],
      },
      inputs: undefined,
    });
  });
});
