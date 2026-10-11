import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { INVENTORY_KINDS, itemContent } from '@pioneer/character/domain';
import type { ItemContent } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Divider, Heading, Stack } from '@pioneer/frontier';
import { InventoryView } from '@pioneer/rules/ui';
import type { InventoryGroup } from '@pioneer/rules/ui';

import { CharacterStore } from '../../../data/character-store';
import { injectContentRegistry } from '../../../data/content-registry-query';
import { AddItem } from '../add-item/add-item.component';
import { CoinsEdit } from '../coins-edit/coins-edit.component';
import { ItemEdits } from '../item-edits/item-edits.component';
import { sheetInventory } from '../sheet-inventory';

/**
 * The sheet's inventory: items grouped worn, held and stowed with each item's edits beside it, the coins, and a form
 * to add an item. The item kinds load here, apart from the sheet's registry, so a sheet that never scrolls this far
 * never fetches them.
 */
@Component({
  selector: 'pio-inventory-section',
  imports: [
    AddItem,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CoinsEdit,
    Divider,
    Heading,
    InventoryView,
    ItemEdits,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './inventory-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventorySection {
  readonly #store = inject(CharacterStore);

  protected readonly items = injectContentRegistry(INVENTORY_KINDS);
  protected readonly content: Signal<ItemContent | undefined> = computed(() => {
    const registry = this.items.data();
    return registry === undefined ? undefined : itemContent(registry);
  });
  protected readonly groups: Signal<readonly InventoryGroup[] | undefined> = computed(() => {
    const content = this.content();
    const character = this.#store.selected();
    return content === undefined || character === undefined
      ? undefined
      : sheetInventory(character.document.inventory, content);
  });
}
