import { levelTimeline, SlotStatus } from '@pioneer/character/domain';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ChoiceState } from '@pioneer/rules/ui';
import type { ChoiceLine, LevelTimelineRow } from '@pioneer/rules/ui';

import { lineOf } from './sheet-choices';
import { sheetSlotContent } from './sheet-slot-content';

/**
 * A slot as its level's row shows it. The row names the level, so a planned slot says nothing of it; one with nothing
 * picked reads as not chosen, like an open one.
 */
function timelineLine(slot: CharacterSlot): ChoiceLine {
  const line = lineOf(slot);
  const unpicked = slot.status === SlotStatus.Planned && slot.selection === undefined;
  return unpicked ? { ...line, state: ChoiceState.Open, level: undefined } : line;
}

/** One row per level from 1 to 20 with the slots it opens, the character's level marked (#491). */
export function sheetTimeline(registry: ContentRegistry, character: Character): readonly LevelTimelineRow[] {
  return levelTimeline(character.document, sheetSlotContent(registry)).map(({ level, slots }) => ({
    level,
    current: level === character.document.level,
    lines: slots.map((slot) => timelineLine(slot)),
    picks: [],
  }));
}
