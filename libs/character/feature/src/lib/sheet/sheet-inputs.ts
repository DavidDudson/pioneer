import { attributeModifiers, boostContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { StatisticInputs } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';

/** What the engine reads of a character so far: level and the modifiers its boosts give, every rank untrained. */
export function statisticInputsOf(registry: ContentRegistry, character: Character): StatisticInputs {
  return {
    level: character.level,
    attributes: attributeModifiers(character.document, boostContent(registry)),
    ranks: new Map(),
  };
}
