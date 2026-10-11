import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { attributeModifiers, boostContent, INVESTED_MAX, itemContent, runeContent } from '@pioneer/character/domain';
import type { ItemContent, RunedContent } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Divider, Heading, Stack } from '@pioneer/frontier';
import type { AsyncQuery } from '@pioneer/frontier';
import { Attribute } from '@pioneer/rules/sdk';
import type { AttributeModifier, ContentRegistry } from '@pioneer/rules/sdk';
import { BulkView, InventoryView, InvestmentsView } from '@pioneer/rules/ui';
import type { CarriedBulk, InventoryGroup, Investment } from '@pioneer/rules/ui';

import { CharacterStore } from '../../../data/character-store';
import { CHARACTER_CONTENT_KINDS, injectContentRegistry } from '../../../data/content-registry-query';
import { AddItem } from '../add-item/add-item.component';
import { CoinsEdit } from '../coins-edit/coins-edit.component';
import { ItemEdits } from '../item-edits/item-edits.component';
import { ItemRuneEdits } from '../item-rune-edits/item-rune-edits.component';
import { sheetBulk } from '../sheet-bulk';
import { INVENTORY_CONTENT_KINDS, sheetInventory } from '../sheet-inventory';

/**
 * The sheet's inventory: items grouped worn, held, stowed and dropped with each item's edits and runes beside it, a form to
 * add an item, the Bulk carried against the limits Strength sets, the investments against their limit with what each
 * turns on, and the coins. The item kinds for the list, its edits and the Bulk load here, with the character's own kinds
 * for the Strength the Bulk limits read (the sheet page's query, so they load once); the sheet page loads the item
 * kinds for the engine too once the character carries anything.
 */
@Component({
  selector: 'pio-inventory-section',
  imports: [
    AddItem,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    BulkView,
    CoinsEdit,
    Divider,
    Heading,
    InventoryView,
    InvestmentsView,
    ItemEdits,
    ItemRuneEdits,
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

  protected readonly items = injectContentRegistry(INVENTORY_CONTENT_KINDS);
  /** The character's own kinds, for the Strength the Bulk limits read; the Bulk region follows this query. */
  protected readonly attributes = injectContentRegistry(CHARACTER_CONTENT_KINDS);
  readonly #strength = computed((): AttributeModifier | undefined => {
    const registry = this.attributes.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined
      ? undefined
      : attributeModifiers(character.document, boostContent(registry)).get(Attribute.Strength);
  });
  protected readonly content: Signal<ItemContent | undefined> = computed(() => {
    const registry = this.items.data();
    return registry === undefined ? undefined : itemContent(registry);
  });
  /** The items, and the runes to etch onto them. */
  protected readonly runed: Signal<RunedContent | undefined> = computed(() => {
    const registry = this.items.data();
    const items = this.content();
    return registry === undefined || items === undefined ? undefined : { items, runes: runeContent(registry) };
  });
  protected readonly bulk: Signal<CarriedBulk | undefined> = computed(() => {
    const content = this.content();
    const character = this.#store.selected();
    const strength = this.#strength();
    return content === undefined || character === undefined || strength === undefined
      ? undefined
      : sheetBulk(character.document.inventory, content, strength);
  });
  protected readonly groups: Signal<readonly InventoryGroup[] | undefined> = computed(() => {
    const runed = this.runed();
    const character = this.#store.selected();
    return runed === undefined || character === undefined
      ? undefined
      : sheetInventory(character.document.inventory, runed);
  });
}
