import { characterStatisticInputs, characterStatistics, maxHitPoints, slotContent } from '@pioneer/character/domain';
import type { Character, PlayState } from '@pioneer/character/domain';
import type { HitPoints } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

import { contentOfCharacter, variantRulesOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';

/** The maximum Hit Points the engine derives from the build and the server's content; undefined while the build has none. */
export async function maxHitPointsOf(
  source: CharacterContentSource,
  character: Character,
  play: PlayState,
): Promise<HitPoints | undefined> {
  const registry = await contentOfCharacter(source, character).registry();
  const variants = await variantRulesOfCharacter(source, character, registry);
  const slots = slotContent(registry, variants);
  const inputs = characterStatisticInputs(registry, character.document, slots);
  return maxHitPoints(characterStatistics({ ...character.document, play }, { registry, slots, inputs, variants }));
}

/** The maximum Hit Points the engine derives from the build and the server's content; a character with none is refused. */
export async function derivedMaxHitPoints(
  source: CharacterContentSource,
  character: Character,
  play: PlayState,
): Promise<HitPoints> {
  const max = await maxHitPointsOf(source, character, play);
  if (max === undefined) {
    throw new ValidationError([{ path: ['command'], message: message('character.validation.noMaxHitPoints') }]);
  }
  return max;
}
