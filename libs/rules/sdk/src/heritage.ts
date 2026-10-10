import * as z from 'zod';

import { ContentId } from './content-id';

/**
 * A heritage's `data` on the `ContentEntry` envelope (Foundry pf2e's `ancestry`). What it grants is in `rules`.
 */
export const HeritageData = z.strictObject({
  /** The `ancestry` entry it belongs to; absent for a versatile heritage, which any ancestry can take. */
  ancestry: ContentId.optional(),
});
export type HeritageData = z.infer<typeof HeritageData>;
