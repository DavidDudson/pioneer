import { PickIndex } from '@pioneer/character/domain';
import type { PickSource } from '@pioneer/character/domain';

/** How many values one 32-bit draw can take. */
const DRAW_COUNT = PickIndex.parse(4_294_967_296);

/** Picks for a roll nobody needs to repeat: the browser's own randomness. */
export const cryptoPicks: PickSource = {
  below: (bound) => {
    const [drawn = 0] = crypto.getRandomValues(new Uint32Array(1));
    return PickIndex.parse(Math.floor((drawn / DRAW_COUNT) * bound));
  },
};
