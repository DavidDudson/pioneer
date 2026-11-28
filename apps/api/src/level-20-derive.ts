import { characterStatisticInputs, characterStatistics } from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import type { StatisticResult } from '@pioneer/rules/engine';
import type { ContentRegistry, Selector } from '@pioneer/rules/sdk';

/**
 * Slots no build can fill yet, by class: Monk's Third Path to Perfection offers
 * nothing, and Commander's eleven tactic choices have no tactics to pick from. Every other slot of every class is
 * filled.
 */
const COMMANDER_UNFILLABLE = 11;

const UNFILLABLE: ReadonlyMap<string, number> = new Map([
  ['Monk', 1],
  ['Commander', COMMANDER_UNFILLABLE],
]);

/** How many slots of the class `name` no build can fill yet. */
export function unfillableSlots(name: string): number {
  return UNFILLABLE.get(name) ?? 0;
}

/** The whole derivation a sheet makes: the statistic inputs from the build and its gear, then every statistic. */
export function deriveSheet(
  registry: ContentRegistry,
  slots: SlotContent,
  document: CharacterDocument,
): ReadonlyMap<Selector, StatisticResult> {
  const inputs = characterStatisticInputs(registry, document, { slots });

  return characterStatistics(document, { registry, slots, inputs, variants: [] });
}

/** The selectors in `statistics` that did not resolve. */
export function failedSelectors(statistics: ReadonlyMap<Selector, StatisticResult>): ReadonlyArray<Selector> {
  return [...statistics].flatMap(([selector, result]) => (result.ok ? [] : [selector]));
}
