import { activeState, CarryState, INVENTORY_KINDS } from '@pioneer/character/domain';
import type { Character, InventoryItem, ItemContent } from '@pioneer/character/domain';
import { OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentKind } from '@pioneer/rules/sdk';
import type { Investment, InvestmentEffect, NamedStatistic } from '@pioneer/rules/ui';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';

/** The registry kinds the sheet's engine reads once the character has equipment: its own and the item kinds. */
export const EQUIPMENT_CONTENT_KINDS: readonly ContentKind[] = [...CHARACTER_CONTENT_KINDS, ...INVENTORY_KINDS];

/** Whether anything `character` carries could work on it: an item worn, held or invested. */
export function carriesEquipment(character: Character | undefined): boolean {
  return (
    character?.document.inventory.items.some(
      ({ carry, invested }) => carry.state === CarryState.Worn || carry.state === CarryState.Held || invested === true,
    ) === true
  );
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
