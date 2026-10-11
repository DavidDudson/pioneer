import {
  attributeModifiers,
  boostContent,
  buildRanks,
  classContent,
  classInputs,
  equippedInputs,
  itemContent,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { StatisticInputs } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** What the ancestry gives: `@ancestry.hp` and `@ancestry.speed`. Nothing while it is unpicked or not loaded. */
function ancestryInputs(registry: ContentRegistry, character: Character): Pick<StatisticInputs, 'ancestry'> {
  const ancestry = character.ancestry === undefined ? undefined : registry.ancestry(character.ancestry);
  if (ancestry === undefined) {
    return {};
  }
  const { hitPoints, speed } = ancestry.definition;
  return { ancestry: { hitPoints, speed } };
}

/** What the class gives: `@class.hp` and the key attribute. Nothing until the class and its key attribute are known. */
function classInputsOf(registry: ContentRegistry, character: Character): Pick<StatisticInputs, 'class'> {
  const inputs = classInputs(character.document, sheetSlotContent(registry), classContent(registry));
  return inputs === undefined ? {} : { class: inputs };
}

function readInputs(registry: ContentRegistry, character: Character): StatisticInputs {
  return {
    level: character.level,
    attributes: attributeModifiers(character.document, boostContent(registry)),
    ranks: buildRanks(character.document, sheetSlotContent(registry)),
    ...ancestryInputs(registry, character),
    ...classInputsOf(registry, character),
    ...equippedInputs(character.document.inventory, itemContent(registry)),
  };
}

/** Inputs already read, by registry and character: the defences, statistics and skills each read them per edit. */
const READ = new WeakMap<ContentRegistry, WeakMap<Character, StatisticInputs>>();

/**
 * What the engine reads of a character so far: level, the modifiers its boosts give, the ranks its class, background,
 * features and skill picks raise, what its ancestry and class give, and its worn armour and held weapons when the
 * registry holds the item kinds. Read once per registry and character.
 */
export function statisticInputsOf(registry: ContentRegistry, character: Character): StatisticInputs {
  const byCharacter = READ.get(registry) ?? new WeakMap<Character, StatisticInputs>();
  READ.set(registry, byCharacter);
  const inputs = byCharacter.get(character) ?? readInputs(registry, character);
  byCharacter.set(character, inputs);
  return inputs;
}
