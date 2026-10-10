import * as z from 'zod';

import { DiceExpression, DiceTerm, FlatTerm, KeepMode, Sign, TermKind } from './expression';
import type { Keep, Term } from './expression';
import type { RandomSource } from './random';
import { DieFace, RollTotal } from './units';

/** One die rolled, and whether it counts towards the term (`kh`/`kl` drop the rest). */
export const DieResult = z.object({ face: DieFace, kept: z.boolean() });
export type DieResult = z.infer<typeof DieResult>;

/** A dice term's dice in the order rolled, and its signed contribution to the total. */
export const DiceTermResult = z.object({ term: DiceTerm, dice: z.array(DieResult), value: RollTotal });
export type DiceTermResult = z.infer<typeof DiceTermResult>;

export const FlatTermResult = z.object({ term: FlatTerm, value: RollTotal });
export type FlatTermResult = z.infer<typeof FlatTermResult>;

export const TermResult = z.union([DiceTermResult, FlatTermResult]);
export type TermResult = z.infer<typeof TermResult>;

/**
 * A finished roll that keeps everything it was rolled from: the expression, every die, which dice
 * were kept, and each term's share of the total, so a log can always answer "why 23?".
 */
export const RollResult = z.object({ expression: DiceExpression, terms: z.array(TermResult), total: RollTotal });
export type RollResult = z.infer<typeof RollResult>;

/** Marks which faces a keep rule keeps. Ties keep the die rolled first. */
function applyKeep(faces: readonly DieFace[], keep: Keep | undefined): DieResult[] {
  if (keep === undefined) {
    return faces.map((face) => ({ face, kept: true }));
  }
  const order = keep.mode === KeepMode.Highest ? -1 : 1;
  const ranked = faces
    .map((face, index) => ({ face, index }))
    .toSorted((left, right) => order * (left.face - right.face) || left.index - right.index);
  const keptIndexes = new Set(ranked.slice(0, keep.count).map(({ index }) => index));
  return faces.map((face, index) => ({ face, kept: keptIndexes.has(index) }));
}

const NEGATE = -1;

const signed = (term: Term, magnitude: RollTotal): RollTotal =>
  RollTotal.parse(term.sign === Sign.Minus ? magnitude * NEGATE : magnitude);

function rollTerm(term: Term, random: RandomSource): TermResult {
  if (term.kind === TermKind.Flat) {
    return { term, value: signed(term, RollTotal.parse(term.value)) };
  }
  const faces = Array.from({ length: term.count }, () => random.roll(term.size));
  const dice = applyKeep(faces, term.keep);
  let sum = 0;
  for (const die of dice) {
    sum += die.kept ? die.face : 0;
  }
  return { term, dice, value: signed(term, RollTotal.parse(sum)) };
}

/** Rolls every term of `expression` with faces from `random`. Pure apart from the faces drawn. */
export function rollDice(expression: DiceExpression, random: RandomSource): RollResult {
  const terms = expression.terms.map((term) => rollTerm(term, random));
  let total = 0;
  for (const result of terms) {
    total += result.value;
  }
  return { expression, terms, total: RollTotal.parse(total) };
}
