import { attributeModifiers, boostContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { StatisticInputs } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';

/** What the ancestry gives: `@ancestry.hp` and `@ancestry.speed`. Nothing while it is unpicked or not loaded. */
function ancestryInputs(registry: ContentRegistry, character: Character): Pick<StatisticInputs, 'ancestry'> {
  const ancestry = character.ancestry === undefined ? undefined : registry.ancestry(character.ancestry);
  if (ancestry === undefined) {
    return {};
  }
  const { hitPoints, speed } = ancestry.definition;
  return { ancestry: { hitPoints, speed } };
}

/**
 * What the engine reads of a character so far: level, the modifiers its boosts give and its ancestry's Hit Points and
 * speed, every rank untrained.
 */
export function statisticInputsOf(registry: ContentRegistry, character: Character): StatisticInputs {
  return {
    level: character.level,
    attributes: attributeModifiers(character.document, boostContent(registry)),
    ranks: new Map(),
    ...ancestryInputs(registry, character),
  };
}
