import { PickIndex } from '../pick-source';
import type { PickSource } from '../pick-source';

/**
 * Picks the given indices in order, then repeats them, each wrapped into the bound it answers. For tests that
 * need exact choices.
 */
export function scriptedPicks(indices: readonly PickIndex[]): PickSource {
  let next = 0;
  return {
    below: (bound) => {
      const index = indices[next % indices.length];
      next += 1;
      if (index === undefined) {
        throw new Error('scriptedPicks needs at least one index');
      }
      return PickIndex.parse(index % bound);
    },
  };
}
