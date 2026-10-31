/** What a merge of a pack's entries did, and the sum of such tallies. */

export interface OutcomesReport {
  readonly added: number;
  readonly kept: number;
  readonly ambiguous: number;
  /** The entries (`<pack>/<slug>`) whose description differs from the import's, so were skipped. */
  readonly handFixed: readonly string[];
  /** The entries whose description took outcomes. */
  readonly changed: number;
}

export const NO_REPORT: OutcomesReport = { added: 0, kept: 0, ambiguous: 0, handFixed: [], changed: 0 };

/** The sum of two reports. */
export function addReports(left: OutcomesReport, right: OutcomesReport): OutcomesReport {
  return {
    added: left.added + right.added,
    kept: left.kept + right.kept,
    ambiguous: left.ambiguous + right.ambiguous,
    handFixed: [...left.handFixed, ...right.handFixed],
    changed: left.changed + right.changed,
  };
}
