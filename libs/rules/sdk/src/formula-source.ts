import { FORMULA_LENGTH_MAX } from '@pioneer/rules/formula';
import { z } from 'zod';

/**
 * A value written as a formula (`@actor.level`, `max(1, floor(@actor.level / 2))`), kept as its
 * source text. `@pioneer/rules/formula` parses it; checking it at import time is Epic 1.2's
 * reference vocabulary story.
 */
export const FormulaSource = z.string().min(1).max(FORMULA_LENGTH_MAX).brand<'FormulaSource'>();
export type FormulaSource = z.infer<typeof FormulaSource>;
