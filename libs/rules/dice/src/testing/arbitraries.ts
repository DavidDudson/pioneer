import { DamageType } from '@pioneer/rules/sdk';
import { array, constantFrom, integer, oneof, option, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DamageCategory, DiceExpression, KeepMode, Sign, TermKind } from '../expression';
import type { Term } from '../expression';
import { DIE_SIZE_MAX, DIE_SIZE_MIN, FLAT_VALUE_MAX, TERM_COUNT_MAX } from '../units';

/*
 * Arbitraries (fast-check) shared by the dice property tests. Not exported from `testing/index.ts`, so
 * consumers of the testing entry point do not pull in fast-check.
 */

/** Few dice per term keeps runs fast; the parser's own limit is covered separately. */
const MAX_TEST_COUNT = 12;

const damageType = option(constantFrom(...Object.values(DamageType)), { nil: undefined });
const category = option(constantFrom(...Object.values(DamageCategory)), { nil: undefined });
const tags = record({ type: damageType, category }, { requiredKeys: [] });
const sign = constantFrom(Sign.Plus, Sign.Minus);
export const size = integer({ min: DIE_SIZE_MIN, max: DIE_SIZE_MAX });
const keepMode = constantFrom(KeepMode.Highest, KeepMode.Lowest);

/** Raw shapes; `DiceExpression.parse` validates and brands them. */
const keepOf = (count: number): Arbitrary<unknown> =>
  option(record({ mode: keepMode, count: integer({ min: 1, max: count }) }), { nil: undefined });

const diceTerm = integer({ min: 1, max: MAX_TEST_COUNT }).chain((count) =>
  record({ kind: constantFrom(TermKind.Dice), sign, count: constantFrom(count), size, keep: keepOf(count), tags }),
);
const flatTerm = record({
  kind: constantFrom(TermKind.Flat),
  sign,
  value: integer({ min: 0, max: FLAT_VALUE_MAX }),
  tags,
});
const terms = array(oneof(diceTerm, flatTerm), { minLength: 1, maxLength: TERM_COUNT_MAX });
export const expression: Arbitrary<DiceExpression> = terms.map((raw) => DiceExpression.parse({ terms: raw }));

export interface Bounds {
  readonly min: number;
  readonly max: number;
}

function bounds(term: Term): Bounds {
  const kept = term.kind === TermKind.Dice ? (term.keep?.count ?? term.count) : 0;
  const low = term.kind === TermKind.Dice ? kept : term.value;
  const high = term.kind === TermKind.Dice ? kept * term.size : term.value;
  return term.sign === Sign.Plus ? { min: low, max: high } : { min: 0 - high, max: 0 - low };
}

/** The lowest and highest total `parsed` can roll. */
export function expressionBounds(parsed: DiceExpression): Bounds {
  let min = 0;
  let max = 0;
  for (const term of parsed.terms) {
    const termBounds = bounds(term);
    min += termBounds.min;
    max += termBounds.max;
  }
  return { min, max };
}
