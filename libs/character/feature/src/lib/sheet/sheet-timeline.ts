import { choiceSourceOf, levelTimeline, SlotStatus } from '@pioneer/character/domain';
import type { Character, CharacterSlot, SlotContent } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ChoiceState } from '@pioneer/rules/ui';
import type { ChoiceLine, LevelTimelineRow } from '@pioneer/rules/ui';

import { sourceMessageOf } from './sheet-choice-source';
import { lineOf } from './sheet-choices';
import { sheetSlotContent } from './sheet-slot-content';

/**
 * A slot as its level's row shows it. The row names the level, so a planned slot says nothing of it; one with nothing
 * picked reads as not chosen, like an open one.
 */
function timelineLine(slot: CharacterSlot, character: Character, content: SlotContent): ChoiceLine {
  const base = lineOf(slot);
  const found = choiceSourceOf(slot, character.document, content);
  const line = found === undefined ? base : { ...base, source: sourceMessageOf(found) };
  const unpicked = slot.status === SlotStatus.Planned && slot.selection === undefined;
  return unpicked ? { ...line, state: ChoiceState.Open, level: undefined } : line;
}

/** One row per level from 1 to 20 with the slots it opens, the character's level marked (#491). */
export function sheetTimeline(registry: ContentRegistry, character: Character): readonly LevelTimelineRow[] {
  const content = sheetSlotContent(registry);
  return levelTimeline(character.document, content).map(({ level, slots }) => ({
    level,
    current: level === character.document.level,
    lines: slots.map((slot) => timelineLine(slot, character, content)),
    picks: [],
  }));
}
