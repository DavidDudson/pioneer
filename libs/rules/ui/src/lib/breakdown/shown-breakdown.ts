import type { MarkedLineStatus } from './breakdown-messages';

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
}

/** A statistic's breakdown, worded: its base and the terms that give it, then its modifier lines. */
export interface ShownBreakdown {
  readonly base: string;
  readonly terms: readonly ShownTerm[];
  readonly lines: readonly ShownLine[];
}
