import { z } from 'zod';

/**
 * Formula limits. Formulas are content, so they are short; the limits keep a typed or imported
 * formula cheap to parse and evaluate, and keep the recursive parser well inside the stack.
 */
export const FORMULA_LENGTH_MAX = 500;
export const NESTING_DEPTH_MAX = 32;
export const NODE_COUNT_MAX = 200;
export const FORMULA_NUMBER_MAX = 999_999;

/** Formula text as typed or stored. Any text is accepted here; the parser reports what is wrong with it. */
export const FormulaText = z.string().brand<'FormulaText'>();
export type FormulaText = z.infer<typeof FormulaText>;

/** A 1-based character position in formula text, for pointing at a mistake. */
export const TextPosition = z
  .int()
  .positive()
  .max(FORMULA_LENGTH_MAX + 1)
  .brand<'FormulaTextPosition'>();
export type TextPosition = z.infer<typeof TextPosition>;

/** A whole number as written in a formula (`2` in `@level / 2`); a minus in front is its own node. */
export const FormulaNumber = z.int().nonnegative().max(FORMULA_NUMBER_MAX).brand<'FormulaNumber'>();
export type FormulaNumber = z.infer<typeof FormulaNumber>;

/**
 * One dotted segment of a reference: letters, digits, `_` and `-` in any order, as in Foundry's data paths
 * (`/@([a-z.0-9_-]+)/gi`), so array indexes like `@item.runes.0` work. Hyphens belong to the path, so
 * `@level-1` is one reference: write `@level - 1` to subtract.
 */
const SEGMENT = /^[\w-]+$/u;
const SEPARATOR = '.';

/** The path of a reference without its `@`: `actor.level`, `attr.dex.capped`. What it means is the engine's call. */
export const ReferencePath = z
  .string()
  .refine((path) => path.split(SEPARATOR).every((segment) => SEGMENT.test(segment)))
  .brand<'ReferencePath'>();
export type ReferencePath = z.infer<typeof ReferencePath>;

/** How many nodes deep a formula nests, or how many it has; checked against the limits above. */
export const NodeCount = z.int().nonnegative().brand<'NodeCount'>();
export type NodeCount = z.infer<typeof NodeCount>;
