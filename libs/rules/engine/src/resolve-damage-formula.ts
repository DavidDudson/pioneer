import { DiceExpressionText, parseDiceExpression } from '@pioneer/rules/dice';
import type { DiceExpression } from '@pioneer/rules/dice';
import { FormulaText, parseFormula, references } from '@pioneer/rules/formula';
import type { FormulaReference, FormulaValue } from '@pioneer/rules/formula';
import type { DamageFormula } from '@pioneer/rules/sdk';

import { resolverFor } from './statistic-inputs';
import type { StatisticInputs } from './statistic-inputs';

/** A damage formula read against a character: the dice to roll, or the text that has no value (`@ancestry.hp`). */
export type ResolvedDamageFormula =
  { readonly ok: true; readonly expression: DiceExpression } | { readonly ok: false; readonly unresolved: FormulaText };

/** The `d` of a dice term, which the formula grammar reads as a product once swapped for `*`. */
const DICE_D = /(?<=[\d)])d(?=\d)/gu;
const AS_PRODUCT = '*';

/** A sign written beside a negative value: `+ -1` is `- 1`, `- -1` is `+ 1`. */
const PLUS_NEGATIVE = /\+\s*-\s*/gu;
const MINUS_NEGATIVE = /-\s*-\s*/gu;

/** A dice count left in brackets by its value: `(3)d6` is `3d6`. */
const BRACKETED_COUNT = /\((?<count>\d+)\)(?=d)/gu;

const SPACES = /\s+/gu;

/** `text` with the reference at `position` (1-based, the `@` included) replaced by `value`. */
function replaced(text: FormulaText, { path, position }: FormulaReference, value: FormulaValue): FormulaText {
  const start = position - 1;
  return FormulaText.parse(`${text.slice(0, start)}${value}${text.slice(start + path.length + 1)}`);
}

/** Dice text with the signs of negative values folded into the operators. */
function tidied(text: FormulaText): DiceExpressionText | undefined {
  const tidy = text
    .replaceAll(PLUS_NEGATIVE, '- ')
    .replaceAll(MINUS_NEGATIVE, '+ ')
    .replaceAll(BRACKETED_COUNT, '$<count>')
    .replaceAll(SPACES, '');
  return DiceExpressionText.safeParse(tidy).data;
}

/**
 * `formula` as the dice a character rolls: each `@` reference replaced by the character's value for it (`1d8 + @attr.str`
 * for Strength +3 is `1d8 + 3`). Only what the character's inputs hold resolves: attributes, level, ancestry and class.
 * Never throws; a reference with no value, or text that does not read as dice once resolved, is the `unresolved` text.
 */
export function resolveDamageFormula(formula: DamageFormula, inputs: StatisticInputs): ResolvedDamageFormula {
  const parsed = parseFormula(FormulaText.parse(formula.replaceAll(DICE_D, AS_PRODUCT)));
  const resolve = resolverFor(
    { inputs, proficiency: { bonuses: new Map(), origin: undefined } },
    (): undefined => undefined,
  );
  let text = FormulaText.parse(formula);
  for (const reference of parsed.ok ? references(parsed.formula).toReversed() : []) {
    const value = resolve(reference.path);
    if (value === undefined) {
      return { ok: false, unresolved: FormulaText.parse(`@${reference.path}`) };
    }
    text = replaced(text, reference, value);
  }
  const tidy = parsed.ok ? tidied(text) : undefined;
  const dice = tidy === undefined ? undefined : parseDiceExpression(tidy);
  return dice?.ok === true
    ? { ok: true, expression: dice.expression }
    : { ok: false, unresolved: FormulaText.parse(formula) };
}
