import { characterStatistics, characterVitals } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { StatisticResult, VitalsInPlay } from '@pioneer/rules/engine';
import { Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';
import { sheetSlotContent } from './sheet-slot-content';

/** The sheet's statistics, in order: Armor Class, the three saves, then Perception. */
const SHEET_STATISTICS: readonly Selector[] = ['ac', 'save:fortitude', 'save:reflex', 'save:will', 'perception'].map(
  (selector) => Selector.parse(selector),
);

/** The speeds beside the land Speed; each shows only once something gives the character one. */
const OTHER_SPEEDS: readonly Selector[] = ['speed:fly', 'speed:swim', 'speed:climb', 'speed:burrow'].map((selector) =>
  Selector.parse(selector),
);

/** Everything the engine derives for a character, by statistic or instance selector. */
export type SheetDerivation = ReadonlyMap<Selector, StatisticResult>;

/** Derivations already made, by registry and character: the statistics, Strikes and spellcasting each read them. */
const DERIVED = new WeakMap<ContentRegistry, WeakMap<Character, SheetDerivation>>();

/**
 * Every statistic the engine derives for a character, with the rule elements of the items it wears, holds or has
 * invested in play when the registry holds the item kinds. Derived once per registry and character; empty without a
 * proficiency bonus table, as nothing can be derived.
 */
export function sheetDerivation(registry: ContentRegistry, character: Character): SheetDerivation {
  const byCharacter = DERIVED.get(registry) ?? new WeakMap<Character, SheetDerivation>();
  DERIVED.set(registry, byCharacter);
  const derived = byCharacter.get(character) ?? derive(registry, character);
  byCharacter.set(character, derived);
  return derived;
}

function derive(registry: ContentRegistry, character: Character): SheetDerivation {
  return characterStatistics(character.document, {
    registry,
    slots: sheetSlotContent(registry),
    inputs: statisticInputsOf(registry, character),
  });
}

/**
 * A character's AC, saves and Perception from the engine (`sheetDerivation`), then the fly, swim, climb and burrow
 * Speeds a rule gives them, each named by the statistic that applies: the last pack's definition of its selector, as
 * the engine chooses. A statistic no registered pack defines is left out, and so is a Speed that is not above 0.
 */
export function sheetStatistics(registry: ContentRegistry, character: Character): readonly NamedStatistic[] {
  const results = sheetDerivation(registry, character);
  return [...SHEET_STATISTICS, ...OTHER_SPEEDS].flatMap((selector): NamedStatistic[] => {
    const result = results.get(selector);
    const entry = registry.statisticsFor(selector).at(-1);
    if (result === undefined || entry === undefined || (OTHER_SPEEDS.includes(selector) && !hasSpeed(result))) {
      return [];
    }
    return [{ name: entry.definition.name, kind: entry.definition.kind, result }];
  });
}

/**
 * The fast healing, temporary Hit Points and size the character's rule elements give, from the engine (`vitalsInPlay`);
 * undefined until the character has an ancestry.
 */
export function sheetVitalsInPlay(registry: ContentRegistry, character: Character): VitalsInPlay | undefined {
  return characterVitals(
    { registry, slots: sheetSlotContent(registry), inputs: statisticInputsOf(registry, character) },
    character.document,
  );
}

/** Whether a derived Speed is above 0: the character moves that way. */
function hasSpeed(result: StatisticResult): boolean {
  return result.ok && result.total > 0;
}
