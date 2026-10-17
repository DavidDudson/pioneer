import { Uuid } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** A campaign's key item, which an inventory line can be the holder's copy of. */
export const KeyItemId = Uuid.brand<'KeyItemId'>();
export type KeyItemId = z.infer<typeof KeyItemId>;
