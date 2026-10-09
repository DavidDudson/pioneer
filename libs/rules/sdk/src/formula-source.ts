import { z } from 'zod';

const FORMULA_LENGTH_MAX = 500;

/**
 * A value written as a formula (`@actor.level`, `max(1, floor(@actor.level / 2))`), kept as its
 * source text. Opaque for now: Epic 1.2 parses it into an AST and checks it at import time.
 */
export const FormulaSource = z.string().min(1).max(FORMULA_LENGTH_MAX).brand<'FormulaSource'>();
export type FormulaSource = z.infer<typeof FormulaSource>;
