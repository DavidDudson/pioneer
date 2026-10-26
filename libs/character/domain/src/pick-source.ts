import * as z from 'zod';

/** Where a generated character's randomness starts: the same seed and the same call order give the same picks. */
export const Seed = z.int32().nonnegative().brand<'Seed'>();
export type Seed = z.infer<typeof Seed>;

/** How many choices a pick has to choose between: at least one. */
export const PickBound = z.int().positive().brand<'PickBound'>();
export type PickBound = z.infer<typeof PickBound>;

/** The place of a choice in its list, counted from zero. */
export const PickIndex = z.int().nonnegative().brand<'PickIndex'>();
export type PickIndex = z.infer<typeof PickIndex>;

/**
 * Where choices come from. The character domain is pure apart from this port: generation reads it instead of
 * `Math.random`, production wraps a seeded generator ({@link seededPicks}) and tests inject a scripted one.
 */
export interface PickSource {
  /** One choice: an index from 0 up to but not including `bound`, each equally likely. */
  readonly below: (bound: PickBound) => PickIndex;
}

/** Park-Miller "minimal standard" generator: 2^31 - 1 and its multiplier. Products stay exact in a double. */
const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;
const ONE = 1;

/** Reproducible choices from a seed: the same seed gives the same sequence on every runtime. */
export function seededPicks(seed: Seed): PickSource {
  // The state must be in 1..MODULUS-1; 0 would stay 0 forever.
  let state = (seed % (MODULUS - ONE)) + ONE;
  return {
    below: (bound) => {
      state = (state * MULTIPLIER) % MODULUS;
      return PickIndex.parse(Math.floor(((state - ONE) / (MODULUS - ONE)) * bound));
    },
  };
}
