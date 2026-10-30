import * as z from 'zod';

import { AttributeBoost } from './attribute';

const BOOSTS_MAX = 3;

/**
 * A background's `data` on the `ContentEntry` envelope. Its trained skills and lore are `Proficiency` elements in
 * `rules` (`skill:lore:farming`), and its skill feat a `GrantItem`.
 */
export const BackgroundData = z.strictObject({
  /** Usually two: one of two attributes, then a free one; Discarded Duplicate has three free ones. */
  boosts: z.array(AttributeBoost).max(BOOSTS_MAX).readonly(),
});
export type BackgroundData = z.infer<typeof BackgroundData>;
