import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { INVENTORY_KINDS, INVESTED_MAX, itemContent } from '@pioneer/character/domain';
import type { ItemContent } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Divider, Heading, Stack } from '@pioneer/frontier';
import type { AsyncQuery } from '@pioneer/frontier';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { InventoryView, InvestmentsView } from '@pioneer/rules/ui';
import type { InventoryGroup, Investment } from '@pioneer/rules/ui';

import { CharacterStore } from '../../../data/character-store';
import { injectContentRegistry } from '../../../data/content-registry-query';
import { AddItem } from '../add-item/add-item.component';
import { CoinsEdit } from '../coins-edit/coins-edit.component';
import { ItemEdits } from '../item-edits/item-edits.component';
import { sheetInventory } from '../sheet-inventory';

/**
 * The sheet's inventory: items grouped worn, held, stowed and dropped with each item's edits beside it, a form to
 * add an item, the investments against their limit with what each turns on, and the coins. The item kinds for the
 * list and its edits load here; the sheet page loads them for the engine too once the character has equipment.
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
    InvestmentsView,
    ItemEdits,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './inventory-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventorySection {
  /** The invested items and what each turns on, worked out with the sheet's statistics; undefined while they load. */
  public readonly investments = input<readonly Investment[] | undefined>();
  /** The query the investments' registry comes from, so a failure shows in place of the panel. */
  public readonly engine = input.required<AsyncQuery<ContentRegistry>>();

  readonly #store = inject(CharacterStore);
  protected readonly investedMax = INVESTED_MAX;

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
