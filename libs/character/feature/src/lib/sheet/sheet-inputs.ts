import type { Character } from '@pioneer/character/domain';
import type { StatisticInputs } from '@pioneer/rules/engine';

/** What the engine reads of a character so far: level and attribute modifiers, every rank untrained. */
export function statisticInputsOf(character: Character): StatisticInputs {
  return { level: character.level, attributes: character.attributes, ranks: new Map() };
}
