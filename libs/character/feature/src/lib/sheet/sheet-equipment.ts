import { activeState, coinBulk, INVENTORY_KINDS } from '@pioneer/character/domain';
import type { Character, InventoryItem, ItemContent } from '@pioneer/character/domain';
import { ContentKind, OriginHopKind } from '@pioneer/rules/sdk';
import type { Investment, InvestmentEffect, NamedStatistic } from '@pioneer/rules/ui';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';

/**
 * The registry kinds the sheet's engine reads once the character carries anything: its own, the item kinds, the runes
 * etched onto them, and conditions for the encumbered condition its Bulk can bring and the ones active in play.
 */
export const EQUIPMENT_CONTENT_KINDS: readonly ContentKind[] = [
  ...CHARACTER_CONTENT_KINDS,
  ...INVENTORY_KINDS,
  ContentKind.Rune,
  ContentKind.Condition,
];

/**
 * Whether `character` carries anything the engine reads: any item, which may work on it worn, held or invested and
 * weighs on its Bulk, or coins enough to weigh 1 Bulk.
 */
export function carriesAnything(character: Character | undefined): boolean {
  const inventory = character?.document.inventory;
  return inventory !== undefined && (inventory.items.length > 0 || coinBulk(inventory.coins) > 0);
}

/**
 * Whether the engine reads the item and condition kinds for `character`: it carries anything (`carriesAnything`), or
 * has a condition active, whose rule elements the engine puts in play.
 */
export function readsEquipment(character: Character | undefined): boolean {
  return carriesAnything(character) || (character?.document.play.conditions.length ?? 0) > 0;
}

/** The lines `item` adds to the statistics, each with its statistic's name. */
function effectsOf(item: InventoryItem, statistics: readonly NamedStatistic[]): readonly InvestmentEffect[] {
  return statistics.flatMap(({ name, result }) =>
    result.ok
      ? result.lines
          .filter(({ modifier }) => {
            const [hop] = modifier.origin.hops;
            return hop?.kind === OriginHopKind.Inventory && hop.item === item.id;
          })
          .map((line) => ({ statistic: name, line }))
      : [],
  );
}

/**
 * The character's invested items, in inventory order, each with whether it works (worn or held as it is used) and
 * the lines it adds to `statistics`.
 */
export function sheetInvestments(
  character: Character,
  content: ItemContent,
  statistics: readonly NamedStatistic[],
): readonly Investment[] {
  return character.document.inventory.items
    .filter(({ invested }) => invested === true)
    .map((item) => {
      const entry = content.get(item.item);
      return {
        id: item.id,
        name: item.name ?? entry?.name,
        working: activeState(item, entry) !== undefined,
        effects: effectsOf(item, statistics),
      };
    });
}
