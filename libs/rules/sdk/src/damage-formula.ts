import { FormulaText } from '@pioneer/rules/formula';
import * as z from 'zod';

import { ReferenceScope } from './formula-reference';
import { formulaIssues } from './formula-source';

const DAMAGE_FORMULA_LENGTH_MAX = 200;

/**
 * The `d` of a dice term, after a count that is a number (`2d6`) or a bracketed formula (`(@item.level)d6`).
 * Swapped for `*`, the text checks as a formula with every position unchanged.
 */
const DICE_D = /(?<=[\d)])d(?=\d)/gu;
const AS_PRODUCT = '*';

/** A keep modifier after a dice term (`kh1`, `kl`), blanked out of a formula that allows one. */
const KEEP_DICE = /(?<=\d)k[hl]\d*/gu;

type DamageFormulaSchema = z.core.$ZodBranded<z.ZodString, 'DamageFormula'>;

/** Damage formula text whose references may read `scopes`; each problem is a field issue at its position. */
function damageFormula(scopes?: ReadonlySet<ReferenceScope>, keeps = false): DamageFormulaSchema {
  return z
    .string()
    .min(1)
    .max(DAMAGE_FORMULA_LENGTH_MAX)
    .check((context) => {
      const product = context.value.replaceAll(DICE_D, AS_PRODUCT);
      const masked = keeps ? product.replaceAll(KEEP_DICE, (match) => ' '.repeat(match.length)) : product;
      context.issues.push(...formulaIssues(FormulaText.parse(masked), scopes));
    })
    .brand<'DamageFormula'>();
}

/**
 * A damage roll as rules text writes it: dice and a formula (`2d6`, `1d8 + @attr.str`, `(@item.level)d6`). Everything but the dice must
 * be a formula the vocabulary knows; each problem is a field issue at its position.
 */
export const DamageFormula = damageFormula();
export type DamageFormula = z.infer<typeof DamageFormula>;

/**
 * A spell's damage roll, which may also read the spellcasting entry that casts it (`2d6 + @spellcasting.attr`, the
 * caster's spellcasting attribute modifier).
 */
export const SpellDamageFormula = damageFormula(
  new Set([ReferenceScope.Actor, ReferenceScope.Item, ReferenceScope.Spellcasting]),
);

/** A value an effect badge rolls: a damage formula whose dice may keep the highest or lowest (`2d20kh1`). */
export const RolledFormula = damageFormula(undefined, true);
export type RolledFormula = z.infer<typeof RolledFormula>;
