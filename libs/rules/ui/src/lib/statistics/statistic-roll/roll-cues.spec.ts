import { RollLuck, RollTone } from '@pioneer/frontier';
import { RollEffectStatusKind } from '@pioneer/rules/engine';
import type {
  BreakdownLine,
  DegreeAdjustmentLine,
  RollEffects,
  RollEffectStatus,
  RollTwiceLine,
  StatisticValue,
} from '@pioneer/rules/engine';
import { DegreeChange, ModifierType, Predicate, RollKept } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  IN_DARKNESS,
  line,
  ruleId,
  statistic,
  STEADY_GRIP,
  SURE_FOOTING,
  term,
} from '../../testing/breakdown-fixtures';
import { rollCues } from './roll-cues';

const APPLIED: RollEffectStatus = { kind: RollEffectStatusKind.Applied };
const CONDITIONAL: RollEffectStatus = {
  kind: RollEffectStatusKind.Conditional,
  when: Predicate.parse(['lighting:darkness']),
  summary: undefined,
};

function rollTwice(keep: RollKept, status: RollEffectStatus = APPLIED): RollTwiceLine {
  return { id: ruleId(STEADY_GRIP, 1), label: { entry: STEADY_GRIP }, keep, status };
}

function degree(status: RollEffectStatus = APPLIED): DegreeAdjustmentLine {
  return {
    id: ruleId(SURE_FOOTING, 1),
    label: { entry: SURE_FOOTING },
    adjustment: { success: DegreeChange.OneDegreeBetter },
    status,
  };
}

function check(lines: readonly BreakdownLine[] = [], rollEffects?: Partial<RollEffects>): StatisticValue {
  const base = statistic('skill:acrobatics', { base: [term('5', 5)], lines });
  return rollEffects === undefined
    ? base
    : { ...base, rollEffects: { rollTwice: [], degreeAdjustments: [], ...rollEffects } };
}

const BONUS = line(STEADY_GRIP, { type: ModifierType.Status, value: 2 });
const PENALTY = line(SURE_FOOTING, { type: ModifierType.Circumstance, value: -2 });

describe(rollCues, () => {
  it('is neutral when nothing applies or is conditional', () => {
    expect(rollCues(check())).toStrictEqual({
      tone: RollTone.Neutral,
      luck: RollLuck.None,
      shifted: false,
      conditional: false,
    });
  });

  it('is green for a net bonus from the applied lines', () => {
    const cues = rollCues(check([BONUS]));

    expect(cues.tone).toBe(RollTone.Bonus);
  });

  it('is red for a net penalty from the applied lines', () => {
    const cues = rollCues(check([PENALTY]));

    expect(cues.tone).toBe(RollTone.Penalty);
  });

  it('is neutral when a bonus and a penalty cancel', () => {
    const cues = rollCues(check([BONUS, PENALTY]));

    expect(cues.tone).toBe(RollTone.Neutral);
  });

  it('ignores a conditional line for its colour but marks it with an asterisk', () => {
    const conditional = line(STEADY_GRIP, { type: ModifierType.Status, value: 2, status: IN_DARKNESS });
    const cues = rollCues(check([conditional]));

    expect(cues).toMatchObject({ tone: RollTone.Neutral, conditional: true });
  });

  it('marks a conditional fortune or degree adjustment with an asterisk without applying it', () => {
    const fortune = rollCues(check([], { rollTwice: [rollTwice(RollKept.Higher, CONDITIONAL)] }));
    const shift = rollCues(check([], { degreeAdjustments: [degree(CONDITIONAL)] }));

    expect(fortune).toMatchObject({ luck: RollLuck.None, conditional: true });
    expect(shift).toMatchObject({ shifted: false, conditional: true });
  });

  it('shows fortune for an applied keep-higher and misfortune for an applied keep-lower', () => {
    const fortune = rollCues(check([], { rollTwice: [rollTwice(RollKept.Higher)] }));
    const misfortune = rollCues(check([], { rollTwice: [rollTwice(RollKept.Lower)] }));

    expect(fortune.luck).toBe(RollLuck.Fortune);
    expect(misfortune.luck).toBe(RollLuck.Misfortune);
  });

  it('shows neither when fortune and misfortune both apply, as they cancel', () => {
    const both = [rollTwice(RollKept.Higher), rollTwice(RollKept.Lower)];
    const cues = rollCues(check([], { rollTwice: both }));

    expect(cues.luck).toBe(RollLuck.None);
  });

  it('shows a shifted degree for an applied adjustment', () => {
    const cues = rollCues(check([], { degreeAdjustments: [degree()] }));

    expect(cues.shifted).toBe(true);
  });
});
