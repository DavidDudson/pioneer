import type { MarkedStatus } from './defences-messages';

/** How a line stands, when it does not simply apply, and what explains it, then where it comes from. */
export interface Standing {
  readonly status: MarkedStatus | undefined;
  readonly details: readonly string[];
}

/** A defence as shown: what it is, and how it stands. */
export interface ShownDefence extends Standing {
  readonly key: string;
  readonly text: string;
}

/** One of the three lists, worded: its heading, the line saying it is empty, and its defences. */
export interface ShownList {
  readonly heading: string;
  readonly empty: string;
  readonly defences: readonly ShownDefence[];
}
