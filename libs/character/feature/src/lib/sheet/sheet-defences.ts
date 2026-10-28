import { characterDefences } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { Defences } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { sheetSources } from './sheet-sources';

/**
 * A character's defences from the engine, with the rule elements in play: the battle form's, and those of the
 * character's items, effects and build. Without a proficiency bonus table (no core rules pack) nothing can be
 * derived, and the lists are empty.
 */
export function sheetDefences(registry: ContentRegistry, character: Character): Defences {
  return characterDefences(character.document, sheetSources(registry, character));
}
