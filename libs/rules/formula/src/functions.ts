import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * The functions a formula may call: Foundry's `Math` subset plus the comparison helpers pf2e adds to
 * `Math` (`ternary`, `eq`, `gte`, ...). Nothing else is callable.
 */
export const FormulaFunction = {
  Min: 'min',
  Max: 'max',
  Floor: 'floor',
  Ceil: 'ceil',
  Abs: 'abs',
  Round: 'round',
  Sign: 'sign',
  Ternary: 'ternary',
  Eq: 'eq',
  Ne: 'ne',
  Gt: 'gt',
  Gte: 'gte',
  Lt: 'lt',
  Lte: 'lte',
} as const;
export type FormulaFunction = ValueOf<typeof FormulaFunction>;
export const FormulaFunctionSchema = z.enum(FormulaFunction);

/** How many arguments a call takes. `max` is unbounded for `min` and `max`. */
export const ArgumentCount = z.int().nonnegative().brand<'ArgumentCount'>();
export type ArgumentCount = z.infer<typeof ArgumentCount>;

export interface Arity {
  readonly min: ArgumentCount;
  readonly max: ArgumentCount | undefined;
}

const ONE_ARG = ArgumentCount.parse(1);
const TWO_ARGS = ArgumentCount.parse(2);
const THREE_ARGS = ArgumentCount.parse(3);
const exactly = (count: ArgumentCount): Arity => ({ min: count, max: count });
const ONE = exactly(ONE_ARG);
const TWO = exactly(TWO_ARGS);
const THREE = exactly(THREE_ARGS);
const AT_LEAST_ONE: Arity = { min: ONE_ARG, max: undefined };

export const ARITY: Readonly<Record<FormulaFunction, Arity>> = {
  [FormulaFunction.Min]: AT_LEAST_ONE,
  [FormulaFunction.Max]: AT_LEAST_ONE,
  [FormulaFunction.Floor]: ONE,
  [FormulaFunction.Ceil]: ONE,
  [FormulaFunction.Abs]: ONE,
  [FormulaFunction.Round]: ONE,
  [FormulaFunction.Sign]: ONE,
  [FormulaFunction.Ternary]: THREE,
  [FormulaFunction.Eq]: TWO,
  [FormulaFunction.Ne]: TWO,
  [FormulaFunction.Gt]: TWO,
  [FormulaFunction.Gte]: TWO,
  [FormulaFunction.Lt]: TWO,
  [FormulaFunction.Lte]: TWO,
};
