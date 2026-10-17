import { FlaggedItem, ReviewedCount } from '@pioneer/campaign/domain';
import type { CharacterId, ItemRule, ReviewedItemId, ReviewedRuneId } from '@pioneer/campaign/domain';

/** The line a rule is broken on, and how far. */
export interface Broken {
  readonly character: CharacterId;
  readonly item: ReviewedItemId;
  readonly rule: ItemRule;
}

/** `line` broken by `count`, named after Kyra's Caliburn. */
export function flag(line: Broken, count: number): FlaggedItem {
  return FlaggedItem.parse({
    ...line,
    characterName: 'Kyra',
    itemName: 'Caliburn',
    count: ReviewedCount.parse(count),
  });
}

/** `flagged` for the rune `rune`. */
export function withRune(flagged: FlaggedItem, rune: ReviewedRuneId): FlaggedItem {
  return FlaggedItem.parse({ ...flagged, rune, runeName: 'Flaming' });
}
