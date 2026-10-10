import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { LineStatusKind, OverrideStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
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
  return deriveStatistics({ definitions: [ac], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS }, inputs, {
    rules,
    facts: new PredicateFacts([], CORE_NAMESPACES),
  }).get(Selector.parse('ac'));
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

describe('out of range changes', () => {
  test('a Change that takes the base out of range fails its line and leaves the base, never throws', () => {
    const huge = inPlay({ key: 'Change', selector: 'ac', mode: 'multiply', value: 1e300 }, 'huge');
    expect(derive([huge])).toMatchObject({
      ok: true,
      baseValue: 10,
      overrides: [
        {
          replaced: 10,
          result: 10,
          status: {
            kind: OverrideStatusKind.Failed,
            error: { key: EngineMessage.ChangeOutOfRange },
            position: undefined,
          },
        },
      ],
    });
  });
});
