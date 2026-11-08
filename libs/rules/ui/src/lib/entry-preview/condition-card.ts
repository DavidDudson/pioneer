import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { conditionEndings } from './condition-endings';
import type { EndingSourceOf } from './condition-endings';
import type { EntryPreview } from './entry-preview';

/**
 * What a condition shows for a reader who does not hold it: `card`, the entry's own preview, with the ways it ends, each
 * with its rule text, the DC of its check at the condition's base and the action that does it. No entry is held, so none
 * is named as easing it. An entry that is not a condition, or one with no endings, keeps `card` as it is.
 */
export function conditionCard(entry: ContentEntry, card: EntryPreview, sourceOf: EndingSourceOf): EntryPreview {
  if (entry.kind !== ContentKind.Condition) {
    return card;
  }
  const endings = conditionEndings(sourceOf, new Set(), { endings: entry.data.recovery, value: undefined });
  return endings.length === 0 ? card : { ...card, endings };
}
