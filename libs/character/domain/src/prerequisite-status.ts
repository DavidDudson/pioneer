import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import type { ContentText } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { FeatRead } from './feat-content';

/**
 * Whether a character meets a feat's prerequisites (#466), under Kleene's logic (ADR-0002): met, not met, or unknown
 * when they are printed but don't parse, or read a fact nobody has supplied.
 */
export const PrerequisiteStatus = { Met: 'met', Unmet: 'unmet', Unknown: 'unknown' } as const;
export type PrerequisiteStatus = ValueOf<typeof PrerequisiteStatus>;

const STATUSES: Readonly<Record<Truth, PrerequisiteStatus>> = {
  [Truth.True]: PrerequisiteStatus.Met,
  [Truth.False]: PrerequisiteStatus.Unmet,
  [Truth.Unknown]: PrerequisiteStatus.Unknown,
};

/** One clause of a feat's printed prerequisites, with whether the character meets it. */
export interface PrerequisiteClauseStatus {
  readonly text: ContentText;
  readonly status: PrerequisiteStatus;
}

/**
 * How each clause of `feat`'s prerequisites reads against `facts`, in the order printed: by its own predicate, unknown
 * where the importer couldn't parse it. Undefined for a feat with a single clause or none, whose state is
 * `prerequisiteStatus`.
 */
export function prerequisiteClauseStatuses(
  feat: FeatRead | undefined,
  facts: PredicateFacts,
): readonly PrerequisiteClauseStatus[] | undefined {
  return feat?.clauses?.map(({ text, predicate }): PrerequisiteClauseStatus => ({
    text,
    status: predicate === undefined ? PrerequisiteStatus.Unknown : STATUSES[evaluatePredicate(predicate, facts)],
  }));
}

/** The state of clauses that must all hold, under Kleene's logic: one unmet makes it unmet, else one unknown makes it unknown. */
function allOf(clauses: readonly PrerequisiteClauseStatus[]): PrerequisiteStatus {
  const statuses = new Set(clauses.map(({ status }) => status));
  if (statuses.has(PrerequisiteStatus.Unmet)) {
    return PrerequisiteStatus.Unmet;
  }
  return statuses.has(PrerequisiteStatus.Unknown) ? PrerequisiteStatus.Unknown : PrerequisiteStatus.Met;
}

/**
 * How `feat`'s prerequisites read against `facts`: by its predicate; else, where it has several clauses, by the clauses
 * the importer could parse (one of them unmet makes the feat unmet whatever the rest say); unknown when it has printed
 * prerequisites the importer couldn't parse; met when it has none.
 */
export function prerequisiteStatus(feat: FeatRead | undefined, facts: PredicateFacts): PrerequisiteStatus {
  if (feat?.predicate !== undefined) {
    return STATUSES[evaluatePredicate(feat.predicate, facts)];
  }
  const clauses = prerequisiteClauseStatuses(feat, facts);
  if (clauses !== undefined) {
    return allOf(clauses);
  }
  return feat?.prerequisites === undefined ? PrerequisiteStatus.Met : PrerequisiteStatus.Unknown;
}
