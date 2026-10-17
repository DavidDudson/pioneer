import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterPatchField, InventoryItemId } from '@pioneer/character/domain';
import { AsyncButton, Stack } from '@pioneer/frontier';

import { CharacterStore } from '../../../data/character-store';

/**
 * Remove, beside an item's edits. It acts on the first press when adding the item again would put it back; it asks for a
 * second press only when the item has the player's name or holds something, which adding it again can't restore
 * (interaction rule 4). A key item is never offered it: its player cannot remove or sell it.
 */
@Component({
  selector: 'pio-item-remove',
  imports: [AsyncButton, Stack, TranslocoPipe],
  templateUrl: './item-remove.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemRemove {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the label. */
  public readonly name = input.required<string>();

  readonly #store = inject(CharacterStore);

  /** Whether the GM gave the item as a key item, which its player cannot remove or sell. */
  protected readonly locked = computed(
    (): boolean =>
      this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id())?.keyItem !== undefined,
  );

  /** Whether removing loses what adding again can't restore: the player's name, or where its contents were. */
  protected readonly lossy = computed((): boolean => {
    const items = this.#store.selected()?.document.inventory.items;
    const item = items?.find((each) => each.id === this.id());
    return item?.name !== undefined || items?.some((each) => each.container === this.id()) === true;
  });

  protected readonly remove = async (): Promise<void> => {
    await this.#store.patch({ field: CharacterPatchField.RemoveItem, id: this.id() });
  };
}
