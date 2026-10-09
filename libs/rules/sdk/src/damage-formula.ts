import { FormulaText } from '@pioneer/rules/formula';
import { z } from 'zod';

import { formulaIssues } from './formula-source';

const DAMAGE_FORMULA_LENGTH_MAX = 200;

/** Dice terms (`2d6`), masked to digits of the same length so the rest checks as a formula at the same positions. */
const DICE_TERM = /(?<![\w@.])\d+d\d+(?!\w)/gu;
const MASK_DIGIT = '0';

/**
 * A damage roll as rules text writes it: dice and a formula (`2d6`, `1d8 + @attr.str`). The non-dice part must
 * be a formula the vocabulary knows; each problem is a field issue at its position.
 */
export const DamageFormula = z
  .string()
  .min(1)
  .max(DAMAGE_FORMULA_LENGTH_MAX)
  .check((context) => {
    const masked = context.value.replaceAll(DICE_TERM, (term) => MASK_DIGIT.repeat(term.length));
    context.issues.push(...formulaIssues(FormulaText.parse(masked)));
  })
  .brand<'DamageFormula'>();
export type DamageFormula = z.infer<typeof DamageFormula>;
