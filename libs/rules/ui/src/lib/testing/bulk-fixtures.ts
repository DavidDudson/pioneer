import { BulkStatus } from '../inventory/bulk/carried-bulk';
import type { CarriedBulk } from '../inventory/bulk/carried-bulk';

/** Strength +2: encumbered over 7 Bulk, 12 at most. */
const LIMITS = { encumberedAfter: 7, maximum: 12 } as const;

/** 6 Bulk and 3 light items, under the limits. */
export const LIGHT_LOAD: CarriedBulk = { ...LIMITS, carried: 63, status: BulkStatus.Unencumbered };

/** 9 Bulk, encumbered. */
export const ENCUMBERED_LOAD: CarriedBulk = { ...LIMITS, carried: 90, status: BulkStatus.Encumbered };

/** 14 Bulk and 1 light item, over the maximum. */
export const OVER_MAXIMUM_LOAD: CarriedBulk = { ...LIMITS, carried: 141, status: BulkStatus.OverMaximum };
