import { RuleInPlay } from '@pioneer/rules/engine';
import type { ContentLookup } from '@pioneer/rules/grants';
import {
  ContentKind,
  DamageType,
  Origin,
  ResistanceElement,
  RuleElementKey,
  RuleIndex,
  Slug,
} from '@pioneer/rules/sdk';

import { activeItems, inventoryHop } from './active-items';
import type { Inventory } from './inventory';
import type { ItemContent } from './inventory-content';
import { workingEtchedRunes } from './item-runes';

const LESSER_RESISTANCE = 5;
const GREATER_RESISTANCE = 10;

/** The resistance of each rune made for one damage type, by its entry slug (GM Core): lesser 5, greater 10. */
const CHOSEN_RESISTANCE: ReadonlyMap<Slug, number> = new Map([
  [Slug.parse('energy-resistant'), LESSER_RESISTANCE],
  [Slug.parse('energy-resistant-greater'), GREATER_RESISTANCE],
]);

/** The energies an energy-resistant rune is made for (GM Core). */
const RUNE_ENERGIES: ReadonlySet<string> = new Set([
  DamageType.Acid,
  DamageType.Cold,
  DamageType.Electricity,
  DamageType.Fire,
]);

/**
 * The resistances the energy-resistant runes etched onto the character's active items give: one per rune, to the damage
 * type its crafter chose. A rune etched with no choice, or one naming no energy it is made for, gives none. The
 * choice is the etching's own, so these are made here rather than written in the rune's `rules`, which are the same
 * for every etching.
 */
export function chosenRuneRules(inventory: Inventory, content: ItemContent, lookup: ContentLookup): RuleInPlay[] {
  return activeItems(inventory, content).flatMap((active) =>
    workingEtchedRunes(active.item, active.entry).flatMap(({ rune, choice }, etching) => {
      const entry = lookup.entry(rune);
      const value = entry?.kind === ContentKind.Rune ? CHOSEN_RESISTANCE.get(entry.slug) : undefined;
      if (entry === undefined || value === undefined || choice === undefined || !RUNE_ENERGIES.has(choice)) {
        return [];
      }
      const element = ResistanceElement.safeParse({ key: RuleElementKey.Resistance, type: [choice], value });
      return element.success
        ? [
            RuleInPlay.parse({
              element: element.data,
              origin: Origin.parse({ hops: [inventoryHop(active)], entry: entry.id, sources: entry.sources }),
              rule: RuleIndex.parse(etching),
              itemLevel: content.get(active.item.item)?.level,
            }),
          ]
        : [];
    }),
  );
}
