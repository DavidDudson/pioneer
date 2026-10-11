import type { ValueOf } from '@pioneer/shared/kernel';

/** Whether a character carries more than it should: encumbered past one limit, over its maximum past the other. */
export const BulkStatus = {
  Unencumbered: 'unencumbered',
  Encumbered: 'encumbered',
  OverMaximum: 'overMaximum',
} as const;
export type BulkStatus = ValueOf<typeof BulkStatus>;

/** The Bulk a character carries against its limits, as the Bulk meter shows it. */
export interface CarriedBulk {
  /** In tenths of a Bulk, so light items show: 63 is 6 Bulk and 3 light. */
  readonly carried: number;
  /** Encumbered carrying more whole Bulk than this. */
  readonly encumberedAfter: number;
  /** The most whole Bulk it can carry. */
  readonly maximum: number;
  readonly status: BulkStatus;
}
