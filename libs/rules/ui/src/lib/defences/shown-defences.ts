import type { Origin } from '@pioneer/rules/sdk';

import type { MarkedStatus } from './defences-messages';

/** How a line stands, when it does not simply apply, and what explains it, then where it comes from. */
export interface Standing {
  readonly status: MarkedStatus | undefined;
  readonly detail: string | undefined;
  /** Shown as the line's origin chain and sources. */
  readonly origin: Origin;
}

/**
 * A defence as shown: what it is, and how it stands. Rows are tracked by position, since two copies of one item give
 * lines with the same rule id and type.
 */
export interface ShownDefence extends Standing {
  readonly text: string;
}

/** One of the three lists, worded: its heading, the line saying it is empty, and its defences. */
export interface ShownList {
  readonly heading: string;
  readonly empty: string;
  readonly defences: readonly ShownDefence[];
}
