import { contentKey } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentKey } from '@pioneer/rules/sdk';

import { entryAction, triggerPhrasing } from './trigger-matcher';
import type { RefNames } from './trigger-matcher';

/** One wording that has no event, and how many actions use it. */
export interface UnmatchedPhrasing {
  readonly phrasing: string;
  readonly count: number;
}

/** How many triggered abilities the engine can fire. */
export interface TriggerCoverage {
  /** How many actions, feats and class features have a trigger. */
  readonly triggered: number;
  /** Those with a trigger but no `triggerEvent`, used only by hand until one is set; sorted. */
  readonly withoutEvent: readonly ContentKey[];
  /** The wordings of `withoutEvent`, normalised, most common first (ties in alphabetical order). */
  readonly unmatched: readonly UnmatchedPhrasing[];
}

/** Wordings by how many entries use them, most common first. */
function groupPhrasings(phrasings: readonly string[]): readonly UnmatchedPhrasing[] {
  const counts = new Map<string, number>();

  for (const phrasing of phrasings) {
    counts.set(phrasing, (counts.get(phrasing) ?? 0) + 1);
  }

  return [...counts]
    .map(([phrasing, count]) => ({ phrasing, count }))
    .toSorted((left, right) => right.count - left.count || left.phrasing.localeCompare(right.phrasing));
}

/**
 * Trigger event coverage (play-and-campaigns.md, "Triggered abilities"). Effects have no trigger wording, so only
 * actions count. `names` gives the text of links in a wording. A report, never a check.
 */
export function triggerCoverage(entries: readonly ContentEntry[], names: RefNames = new Map()): TriggerCoverage {
  const triggered = entries.filter((entry) => entryAction(entry)?.trigger !== undefined);
  const unmatched = triggered.filter((entry) => entryAction(entry)?.triggerEvent === undefined);

  return {
    triggered: triggered.length,
    withoutEvent: unmatched.map((entry) => contentKey(entry.pack, entry.slug)).toSorted(),
    unmatched: groupPhrasings(
      unmatched.flatMap((entry) => {
        const trigger = entryAction(entry)?.trigger;

        return trigger === undefined ? [] : [triggerPhrasing(trigger, names)];
      }),
    ),
  };
}
