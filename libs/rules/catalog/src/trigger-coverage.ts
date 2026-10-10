import { contentKey } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentKey } from '@pioneer/rules/sdk';

import { entryAction } from './trigger-matcher';

/** How many triggered abilities the engine can fire. */
export interface TriggerCoverage {
  /** How many actions, feats and class features have a trigger. */
  readonly triggered: number;
  /** Those with a trigger but no `triggerEvent`, used only by hand until one is set; sorted. */
  readonly withoutEvent: readonly ContentKey[];
}

/**
 * Trigger event coverage (play-and-campaigns.md, "Triggered abilities"). Effects have no trigger wording, so only
 * actions count. A report, never a check.
 */
export function triggerCoverage(entries: readonly ContentEntry[]): TriggerCoverage {
  const triggered = entries.filter((entry) => entryAction(entry)?.trigger !== undefined);
  return {
    triggered: triggered.length,
    withoutEvent: triggered
      .filter((entry) => entryAction(entry)?.triggerEvent === undefined)
      .map((entry) => contentKey(entry.pack, entry.slug))
      .toSorted(),
  };
}
