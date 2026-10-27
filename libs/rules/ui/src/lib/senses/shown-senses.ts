import type { Origin } from '@pioneer/rules/sdk';

/** A sense as shown: what it is, the form it comes from if a battle form gives it, and where it comes from. */
export interface ShownSense {
  readonly text: string;
  /** "from Plant Form" when a battle form gives the sense; undefined otherwise. */
  readonly fromForm: string | undefined;
  /** Shown as each origin's chain and sources. */
  readonly origins: readonly Origin[];
}

/** The senses in play, and the ones the character has without its form when a form replaced them. */
export interface ShownSenses {
  readonly senses: readonly ShownSense[];
  readonly own: readonly ShownSense[];
  /** Whether the character has no sense in play. */
  readonly empty: boolean;
  /** Whether there are own senses to offer. */
  readonly hasOwn: boolean;
}
