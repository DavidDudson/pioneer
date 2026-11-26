import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { InventoryItemId, readyDonningCost } from '@pioneer/character/domain';
import type { ReadyDonningCost, RunedContent } from '@pioneer/character/domain';
import { Text } from '@pioneer/frontier';
import { ActionCost } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../../data/character-store';

/** The message key for each cost a ready rune gives, in full. */
const DONNING_KEYS: Readonly<Record<ReadyDonningCost, string>> = {
  [ActionCost.One]: 'character.sheet.donning.one',
  [ActionCost.Two]: 'character.sheet.donning.two',
};

/** One armour with a ready rune: the actions it takes to don it. Shown only while the item has the rune. */
@Component({
  selector: 'pio-item-donning',
  imports: [Text, TranslocoPipe],
  templateUrl: './item-donning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDonning {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the label. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);

  /** The message key for the actions the ready rune makes donning take; none without one. */
  protected readonly donningKey: Signal<string | undefined> = computed(() => {
    const item = this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id());

    if (item === undefined) {
      return undefined;
    }

    const cost = readyDonningCost(item, this.content().items.get(item.item), this.content().runes);

    return cost === undefined ? undefined : DONNING_KEYS[cost];
  });
}
