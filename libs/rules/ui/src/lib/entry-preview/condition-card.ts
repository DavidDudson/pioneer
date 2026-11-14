import { ContentKind } from '@pioneer/rules/sdk';
import type { ConditionValue, ContentEntry } from '@pioneer/rules/sdk';

import { conditionEndings } from './condition-endings';
import type { EndingSourceOf } from './condition-endings';
import type { EntryPreview, PreviewEnding } from './entry-preview';

/**
 * What a condition shows for a reader who does not hold it: `card`, the entry's own preview, with the ways it ends, each
 * with its rule text, the DC of its check at the condition's base and the action that does it. No entry is held, so none
 * is named as easing it. An entry that is not a condition keeps `card` as it is; a condition that carries a value is
 * marked, so a mention of it with a value shows the card at that value (`atValue`).
 */
export function conditionCard(entry: ContentEntry, card: EntryPreview, sourceOf: EndingSourceOf): EntryPreview {
  if (entry.kind !== ContentKind.Condition) {
    return card;
  }
  const endings = conditionEndings(sourceOf, { endings: entry.data.recovery, value: undefined });
  const valued: EntryPreview = entry.data.valued ? { ...card, valued: true } : card;
  const marked: EntryPreview = entry.data.values === undefined ? valued : { ...valued, values: entry.data.values };
  return endings.length === 0 ? marked : { ...marked, endings };
}

/** `ending` with a DC that follows the condition's value worked out at `value`. */
function endingAt(ending: PreviewEnding, value: ConditionValue): PreviewEnding {
  return ending.dcByValue === true && ending.dc !== undefined ? { ...ending, dc: ending.dc + value } : ending;
}

/**
 * `card` of a valued condition as a mention names it ("Frightened 2"): the value beside the name and each DC that follows
 * the value worked out at it. A card of anything else, or one that already holds a value (the character's own), is
 * as it was.
 */
export function atValue(card: EntryPreview, value: ConditionValue | undefined): EntryPreview {
  if (value === undefined || card.valued !== true || card.value !== undefined) {
    return card;
  }
  const endings = card.endings?.map((ending) => endingAt(ending, value));
  return { ...card, value, ...(endings === undefined ? {} : { endings }) };
}
