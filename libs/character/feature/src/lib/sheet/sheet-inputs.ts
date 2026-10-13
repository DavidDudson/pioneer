import { characterStatisticInputs } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { StatisticInputs } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** Inputs already read, by registry and character: the defences, statistics and skills each read them per edit. */
const READ = new WeakMap<ContentRegistry, WeakMap<Character, StatisticInputs>>();

/**
 * What the engine reads of a character (`characterStatisticInputs`), read once per registry and character.
 */
export function statisticInputsOf(registry: ContentRegistry, character: Character): StatisticInputs {
  const byCharacter = READ.get(registry) ?? new WeakMap<Character, StatisticInputs>();
  READ.set(registry, byCharacter);
  const inputs =
    byCharacter.get(character) ?? characterStatisticInputs(registry, character.document, sheetSlotContent(registry));
  byCharacter.set(character, inputs);
  return inputs;
}
