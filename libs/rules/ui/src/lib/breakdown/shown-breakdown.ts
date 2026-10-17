import type { Origin } from '@pioneer/rules/sdk';

import type { MarkedLineStatus, MarkedOverrideStatus } from './breakdown-messages';

/** A base term as shown: as written with its sign, or rounding, what it gives, and the variant setting it. */
export interface ShownTerm {
  /** The term as written (`+ @prof.ac`), the first without its plus; undefined for a rounding line. */
  readonly code: string | undefined;
  readonly value: string;
  /** "Set by the variant rule …", on a `@prof` term while a variant rule sets the bonus. */
  readonly variant: string | undefined;
}

/**
 * A modifier line as shown: its name, its signed value and type, and, when it does not simply apply, its status and
 * what explains it. Rows are tracked by position, since two copies of one item give lines with the same rule id.
 */
export interface ShownLine {
  readonly name: string;
  /** "+1 status"; just the type for a failed line, which has no value. */
  readonly value: string;
  readonly status: MarkedLineStatus | undefined;
  readonly detail: string | undefined;
  /** Where the line comes from, which the line shows as its origin chain and sources. */
  readonly origin: Origin;
}

/**
 * A `Change` or set override as shown: its name, what it did ("override 18 → 20"), whether a user set it by hand,
 * and, when it does not simply apply, its status and what explains it.
 */
export interface ShownOverride {
  readonly name: string;
  readonly effect: string;
  readonly byHand: boolean;
  readonly status: MarkedOverrideStatus | undefined;
  readonly detail: string | undefined;
  readonly origin: Origin;
}

/**
 * A statistic's breakdown, worded: the set override that pinned its total, if one did, its base and the terms that
 * give it, its modifier lines, then its `Change`s and set overrides in the order they ran.
 */
export interface ShownBreakdown {
  /** "Set by the GM pins it to 20; computed 18."; undefined when no set override pinned the total. */
  readonly pinned: string | undefined;
  /** "22 from Plant Form (arboreal); yours 19"; undefined when no battle form replaces the statistic. */
  readonly form: string | undefined;
  readonly base: string;
  readonly terms: readonly ShownTerm[];
  readonly lines: readonly ShownLine[];
  readonly overrides: readonly ShownOverride[];
}
