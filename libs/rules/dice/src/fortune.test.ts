import { describe, expect, test } from 'bun:test';

import { message } from '@pioneer/shared/kernel';

import { NO_FORTUNE, RollMode, rollWithFortune } from './fortune';
import type { FortunedRoll, FortuneSources } from './fortune';
import { DiceMessage } from './messages';
import { parseDiceExpression } from './parse';
import { scriptedRandom } from './testing';
import { DiceExpressionText, DieFace, RollTotal } from './units';

const LUCKY = message('effect.lucky');
const CURSED = message('effect.cursed');

function roll(text: string, sources: FortuneSources, faces: readonly number[]): FortunedRoll {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(outcome.error.key);
  }
  return rollWithFortune(outcome.expression, sources, scriptedRandom(faces.map((face) => DieFace.parse(face))));
}

function keptFlags(result: FortunedRoll): readonly boolean[] {
  return result.rolls.map((entry) => entry.kept);
}

describe('rollWithFortune', () => {
  test('without effects rolls once', () => {
    const result = roll('1d20+7', NO_FORTUNE, [12, 3]);
    expect(result.mode).toBe(RollMode.Normal);
    expect(keptFlags(result)).toEqual([true]);
    expect(result.total).toBe(RollTotal.parse(19));
    expect(result.explanation).toEqual(message(DiceMessage.FortuneNormal));
    expect(result.sources).toEqual([]);
  });

  test('fortune rolls twice and keeps the higher', () => {
    const result = roll('1d20+7', { fortune: [LUCKY], misfortune: [] }, [5, 14]);
    expect(result.mode).toBe(RollMode.Fortune);
    expect(result.rolls.map((entry) => entry.result.total)).toEqual([12, 21].map((total) => RollTotal.parse(total)));
    expect(keptFlags(result)).toEqual([false, true]);
    expect(result.total).toBe(RollTotal.parse(21));
    expect(result.explanation).toEqual(message(DiceMessage.FortuneKeptHigher));
    expect(result.sources).toEqual([LUCKY]);
  });

  test('misfortune rolls twice and keeps the lower', () => {
    const result = roll('1d20+7', { fortune: [], misfortune: [CURSED] }, [5, 14]);
    expect(result.mode).toBe(RollMode.Misfortune);
    expect(keptFlags(result)).toEqual([true, false]);
    expect(result.total).toBe(RollTotal.parse(12));
    expect(result.explanation).toEqual(message(DiceMessage.FortuneKeptLower));
  });

  test('a tie keeps the first roll', () => {
    expect(keptFlags(roll('1d20', { fortune: [LUCKY], misfortune: [] }, [9, 9]))).toEqual([true, false]);
    expect(keptFlags(roll('1d20', { fortune: [], misfortune: [CURSED] }, [9, 9]))).toEqual([true, false]);
  });

  test('several fortune effects still roll only twice', () => {
    const result = roll('1d20', { fortune: [LUCKY, LUCKY, LUCKY], misfortune: [] }, [2, 8, 17]);
    expect(result.rolls).toHaveLength(2);
    expect(result.total).toBe(RollTotal.parse(8));
    expect(result.sources).toEqual([LUCKY, LUCKY, LUCKY]);
  });

  test('fortune and misfortune cancel to one roll and keep both sources', () => {
    const result = roll('1d20+7', { fortune: [LUCKY], misfortune: [CURSED] }, [5, 14]);
    expect(result.mode).toBe(RollMode.Cancelled);
    expect(keptFlags(result)).toEqual([true]);
    expect(result.total).toBe(RollTotal.parse(12));
    expect(result.explanation).toEqual(message(DiceMessage.FortuneCancelled));
    expect(result.sources).toEqual([LUCKY, CURSED]);
  });

  test('rerolls the whole expression and compares totals', () => {
    const result = roll('2d6+3', { fortune: [LUCKY], misfortune: [] }, [6, 1, 3, 3]);
    expect(result.rolls.map((entry) => entry.result.total)).toEqual([10, 9].map((total) => RollTotal.parse(total)));
    expect(result.total).toBe(RollTotal.parse(10));
  });
});
