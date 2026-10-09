import { DieFace } from './units';
import type { DieSize } from './units';

/**
 * Where die faces come from. The dice library is pure apart from this port: the browser rolls with
 * {@link cryptoRandom}, campaign rolls will use a server CSPRNG, and tests inject a seeded source.
 */
export interface RandomSource {
  /** One die: a face from 1 to `size`, each equally likely. */
  readonly roll: (size: DieSize) => DieFace;
}

const UINT32_RANGE = 4_294_967_296;

/**
 * Faces from `crypto.getRandomValues`, available in browsers and Bun. Rejection sampling drops the
 * top of the 32-bit range that does not divide evenly by `size`, so no face is more likely than another.
 */
export const cryptoRandom: RandomSource = {
  roll: (size) => {
    const unbiasedLimit = UINT32_RANGE - (UINT32_RANGE % size);
    const sample = new Uint32Array(1);
    for (;;) {
      crypto.getRandomValues(sample);
      const [value = unbiasedLimit] = sample;
      if (value < unbiasedLimit) {
        return DieFace.parse((value % size) + 1);
      }
    }
  },
};
