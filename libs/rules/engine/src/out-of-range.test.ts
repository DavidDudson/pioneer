import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector } from '@pioneer/rules/sdk';

import { LineStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import type { RuleInPlay } from './rule-in-play';
import type { StatisticResult } from './statistic-bases';
import { StatisticInputsJson } from './statistic-inputs';
import { flatModifier, inPlay, statistic } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const ac = statistic('ac', '10');
/** Just under the safe integer range on its own; two of them are past it. */
const NEARLY_UNSAFE = '999999 * 999999 * 9000';

function derive(rules: readonly RuleInPlay[]): StatisticResult | undefined {
  return deriveStatistics([ac], inputs, { rules, facts: new PredicateFacts([]) }).get(Selector.parse('ac'));
}

describe('out of range', () => {
  test('an adjustment that takes a modifier out of range fails the line, never throws', () => {
    const cover = inPlay({ ...flatModifier('circumstance', 3, ['ac']), slug: 'cover' }, 'cover');
    const huge = inPlay(
      { key: 'AdjustModifier', selectors: ['ac'], slug: 'cover', mode: 'multiply', value: 1e300 },
      'huge',
    );
    const result = derive([cover, huge]);
    expect(result).toMatchObject({
      ok: true,
      total: 10,
      lines: [
        {
          value: undefined,
          status: {
            kind: LineStatusKind.Failed,
            error: { key: EngineMessage.AdjustmentOutOfRange },
            position: undefined,
          },
        },
      ],
    });
  });

  test('applied lines that add up past the safe range fail the statistic, never throw', () => {
    const rules = [
      inPlay(flatModifier('untyped', NEARLY_UNSAFE, ['ac']), 'huge-a'),
      inPlay(flatModifier('untyped', NEARLY_UNSAFE, ['ac']), 'huge-b'),
    ];
    expect(derive(rules)).toMatchObject({ ok: false, error: { key: EngineMessage.TotalOutOfRange }, position: 1 });
  });
});
