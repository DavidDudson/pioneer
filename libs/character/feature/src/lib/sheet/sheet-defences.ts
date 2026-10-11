import type { Character } from '@pioneer/character/domain';
import { deriveDefences, statisticContent } from '@pioneer/rules/engine';
import type { Defences, StatisticInputs } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';

const NO_DEFENCES: Defences = { immunities: [], weaknesses: [], resistances: [] };

/** What the engine reads of a character so far: level and attribute modifiers, every rank untrained. */
function statisticInputsOf(character: Character): StatisticInputs {
  return { level: character.level, attributes: character.attributes, ranks: new Map() };
}

/**
 * A character's defences from the engine. No rule elements are in play until the builder puts the character's
 * ancestry, class, feats and items there, so every list is empty for now. Without a proficiency bonus table (no core
 * rules pack) nothing can be derived, and the lists are empty too.
 */
export function sheetDefences(registry: ContentRegistry, character: Character): Defences {
  const content = statisticContent(registry);
  return content === undefined ? NO_DEFENCES : deriveDefences(content, statisticInputsOf(character));
}
