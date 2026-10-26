import { characterStatisticInputs, characterStatistics } from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import type { StatisticResult } from '@pioneer/rules/engine';
import type { ContentRegistry, Selector } from '@pioneer/rules/sdk';

/**
 * Slots no build can fill yet, by class: Monk's Third Path to Perfection offers
 * nothing, Commander's eleven tactic choices have no tactics to pick from, Exemplar's Energized Spark reads invalid
 * whichever element it takes (the grants oscillate), and Witch's Armaments leaves its unarmed attack choice open
 * (the build makes no pick for it yet). Every other slot of every class is filled.
 */
const UNFILLABLE: Readonly<Record<string, number>> = { Monk: 1, Exemplar: 1, Commander: 11, Witch: 1 };

/** How many slots of the class `name` no build can fill yet. */
export function unfillableSlots(name: string): number {
  return UNFILLABLE[name] ?? 0;
}

/** The whole derivation a sheet makes: the statistic inputs from the build and its gear, then every statistic. */
export function deriveSheet(
  registry: ContentRegistry,
  slots: SlotContent,
  document: CharacterDocument,
): ReadonlyMap<Selector, StatisticResult> {
  const inputs = characterStatisticInputs(registry, document, slots);
  return characterStatistics(document, { registry, slots, inputs, variants: [] });
}

/** The selectors in `statistics` that did not resolve. */
export function failedSelectors(statistics: ReadonlyMap<Selector, StatisticResult>): readonly Selector[] {
  return [...statistics].flatMap(([selector, result]) => (result.ok ? [] : [selector]));
}
