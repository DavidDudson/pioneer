import { contentKey, ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentKey } from '@pioneer/rules/sdk';

/** How many feats' prerequisites a builder can check. */
export interface PrerequisiteCoverage {
  /** How many feats have prerequisites. */
  readonly withPrerequisites: number;
  /** Those with prerequisites but no `prerequisitePredicate`, offered as unknown until one is set; sorted. */
  readonly withoutPredicate: readonly ContentKey[];
}

/** Prerequisite coverage (content-model.md, "Prerequisites"). A report, never a check. */
export function prerequisiteCoverage(entries: readonly ContentEntry[]): PrerequisiteCoverage {
  const feats = entries.flatMap((entry) =>
    entry.kind === ContentKind.Feat && entry.data.prerequisites !== undefined ? [entry] : [],
  );
  return {
    withPrerequisites: feats.length,
    withoutPredicate: feats
      .filter((feat) => feat.data.prerequisitePredicate === undefined)
      .map((feat) => contentKey(feat.pack, feat.slug))
      .toSorted(),
  };
}
