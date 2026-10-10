import { FormulaText } from '@pioneer/rules/formula';
import { z } from 'zod';

import { formulaIssues } from './formula-source';

const DAMAGE_FORMULA_LENGTH_MAX = 200;

/**
 * The `d` of a dice term, after a count that is a number (`2d6`) or a bracketed formula (`(@item.level)d6`).
 * Swapped for `*`, the text checks as a formula with every position unchanged.
 */
const DICE_D = /(?<=[\d)])d(?=\d)/gu;
const AS_PRODUCT = '*';

/**
 * A damage roll as rules text writes it: dice and a formula (`2d6`, `1d8 + @attr.str`, `(@item.level)d6`). Everything but the dice must
 * be a formula the vocabulary knows; each problem is a field issue at its position.
 */
export const DamageFormula = z
  .string()
  .min(1)
  .max(DAMAGE_FORMULA_LENGTH_MAX)
  .check((context) => {
    const masked = context.value.replaceAll(DICE_D, AS_PRODUCT);
    context.issues.push(...formulaIssues(FormulaText.parse(masked)));
  })
  .brand<'DamageFormula'>();
export type DamageFormula = z.infer<typeof DamageFormula>;
