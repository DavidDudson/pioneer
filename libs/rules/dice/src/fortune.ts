import { message, MessageDescriptorSchema } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { DiceExpression } from './expression';
import { DiceMessage } from './messages';
import type { RandomSource } from './random';
import { rollDice, RollResult } from './roll';
import { RollTotal } from './units';

/**
 * How a roll was made. Fortune rolls twice and keeps the higher, misfortune rolls twice and keeps the
 * lower; with both, they cancel and the roll is a single normal one.
 */
export const RollMode = {
  Normal: 'normal',
  Fortune: 'fortune',
  Misfortune: 'misfortune',
  Cancelled: 'cancelled',
} as const;
export type RollMode = ValueOf<typeof RollMode>;
export const RollModeSchema = z.enum(RollMode);

/**
 * The fortune and misfortune effects present on a roll, each named by what grants it. Only one of each
 * kind ever applies (you pick the fortune, the GM the worse misfortune), so several of one kind still
 * mean one extra roll; the roll only needs to know whether any are present.
 */
export interface FortuneSources {
  readonly fortune: readonly MessageDescriptor[];
  readonly misfortune: readonly MessageDescriptor[];
}

export const NO_FORTUNE: FortuneSources = { fortune: [], misfortune: [] };

/** One roll of the expression, and whether it is the one that counts. */
export const FortuneRollEntry = z.object({ result: RollResult, kept: z.boolean() });
export type FortuneRollEntry = z.infer<typeof FortuneRollEntry>;

/**
 * A roll after fortune and misfortune: every roll made in the order rolled, which one was kept, the
 * mode with an explanation, and the effects present by kind, so a log can show both rolls and say why.
 */
export const FortunedRoll = z.object({
  mode: RollModeSchema,
  rolls: z.array(FortuneRollEntry).min(1).max(2),
  total: RollTotal,
  explanation: MessageDescriptorSchema,
  sources: z.object({ fortune: z.array(MessageDescriptorSchema), misfortune: z.array(MessageDescriptorSchema) }),
});
export type FortunedRoll = z.infer<typeof FortunedRoll>;

const EXPLANATION_KEYS: Readonly<Record<RollMode, string>> = {
  [RollMode.Normal]: DiceMessage.FortuneNormal,
  [RollMode.Fortune]: DiceMessage.FortuneKeptHigher,
  [RollMode.Misfortune]: DiceMessage.FortuneKeptLower,
  [RollMode.Cancelled]: DiceMessage.FortuneCancelled,
};

function modeOf(sources: FortuneSources): RollMode {
  const hasFortune = sources.fortune.length > 0;
  const hasMisfortune = sources.misfortune.length > 0;
  if (hasFortune && hasMisfortune) {
    return RollMode.Cancelled;
  }
  if (hasFortune) {
    return RollMode.Fortune;
  }
  return hasMisfortune ? RollMode.Misfortune : RollMode.Normal;
}

/** Whether `second` replaces `first` as the kept roll. Ties keep the first roll. */
function prefersSecond(mode: RollMode, first: RollResult, second: RollResult): boolean {
  return mode === RollMode.Fortune ? second.total > first.total : second.total < first.total;
}

/**
 * Rolls `expression` once, or twice keeping the higher (fortune) or lower (misfortune) total. The
 * whole expression is rolled again, so modifiers stay the same and only the dice differ.
 */
export function rollWithFortune(
  expression: DiceExpression,
  sources: FortuneSources,
  random: RandomSource,
): FortunedRoll {
  const mode = modeOf(sources);
  const explanation = message(EXPLANATION_KEYS[mode]);
  const present = { fortune: [...sources.fortune], misfortune: [...sources.misfortune] };
  const first = rollDice(expression, random);
  if (mode === RollMode.Normal || mode === RollMode.Cancelled) {
    return { mode, rolls: [{ result: first, kept: true }], total: first.total, explanation, sources: present };
  }
  const second = rollDice(expression, random);
  const keepSecond = prefersSecond(mode, first, second);
  return {
    mode,
    rolls: [
      { result: first, kept: !keepSecond },
      { result: second, kept: keepSecond },
    ],
    total: keepSecond ? second.total : first.total,
    explanation,
    sources: present,
  };
}
