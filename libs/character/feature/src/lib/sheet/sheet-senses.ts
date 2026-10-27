import { characterSenses } from '@pioneer/character/domain';
import type { Character, CharacterSenses } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { sheetSources } from './sheet-sources';

/**
 * A character's senses from the engine with the rules in play: its ancestry's vision, the senses its rule elements
 * give, and a battle form's, which replace them (with the character's own kept beside).
 */
export function sheetSenses(registry: ContentRegistry, character: Character): CharacterSenses {
  return characterSenses(character.document, sheetSources(registry, character));
}
