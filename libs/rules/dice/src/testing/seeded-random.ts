import { z } from 'zod';

import type { RandomSource } from '../random';
import { DieFace } from '../units';

export const RandomSeed = z.int32().nonnegative().brand<'RandomSeed'>();
export type RandomSeed = z.infer<typeof RandomSeed>;

/** Park-Miller "minimal standard" generator: 2^31 - 1 and its multiplier. Products stay exact in a double. */
const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;

/** Reproducible faces from a seed. For tests only; it is not a fair source for play. */
export function seededRandom(seed: RandomSeed): RandomSource {
  // The state must be in 1..MODULUS-1; 0 would stay 0 forever.
  let state = (seed % (MODULUS - 1)) + 1;
  return {
    roll: (size) => {
      state = (state * MULTIPLIER) % MODULUS;
      return DieFace.parse(Math.floor(((state - 1) / (MODULUS - 1)) * size) + 1);
    },
  };
}

/** Rolls the given faces in order, then repeats them. For tests that need exact dice. */
export function scriptedRandom(faces: readonly DieFace[]): RandomSource {
  let next = 0;
  return {
    roll: () => {
      const face = faces[next % faces.length];
      next += 1;
      if (face === undefined) {
        throw new Error('scriptedRandom needs at least one face');
      }
      return face;
    },
  };
}
