import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterPatchField,
  coatingBulk,
  coatingRefusal,
  hasCoatingRune,
  InventoryItemId,
  ItemQuantity,
} from '@pioneer/character/domain';
import type { InventoryItem, RunedContent } from '@pioneer/character/domain';
import { AsyncButton, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';

import { CharacterStore } from '../../../data/character-store';
import { describeSaveError } from '../../sheet-field';

const ONE = ItemQuantity.parse(1);

/** One stored poison or oil: its place in the space and the name to show it by. */
interface Stored {
  readonly index: number;
  readonly item: ContentId;
  readonly name: string;
}

/**
 * One item with a coating rune: the poisons and oils kept in its extradimensional space (up to 1 Bulk), a button to
 * retrieve each, and a picker to stow another from the character's inventory. Shown only while the item has the rune.
 */
@Component({
  selector: 'pio-item-coating',
  imports: [AsyncButton, OptionPicker, Stack, Text, TranslocoPipe],
  templateUrl: './item-coating.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemCoating {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );

  /** Whether the item has a coating rune, which is all that gives it a space. */
  protected readonly coated = computed(() => {
    const item = this.#item();
    return item !== undefined && hasCoatingRune(item, this.content().items.get(item.item), this.content().runes);
  });

  /** What the space holds, by name. */
  protected readonly stored = computed((): readonly Stored[] =>
    (this.#item()?.state?.coating ?? []).map((item, index) => ({
      index,
      item,
      name: this.content().items.get(item)?.name ?? item,
    })),
  );

  /** The Bulk the space holds, in tenths. */
  protected readonly bulk = computed(() => coatingBulk(this.#item()?.state?.coating ?? [], this.content().items));

  /** The poisons and oils the character carries that fit the space, by inventory line. */
  protected readonly options = computed((): readonly SelectOption<string>[] => {
    const item = this.#item();
    const lines = this.#store.selected()?.document.inventory.items ?? [];
    return item === undefined
      ? []
      : lines
          .filter((line) => line.id !== item.id && coatingRefusal(item, line.item, this.content()) === undefined)
          .map((line) => ({
            value: line.id,
            label: line.name ?? this.content().items.get(line.item)?.name ?? line.item,
          }));
  });

  protected readonly chosen = signal<string | undefined>(undefined);

  /** Puts one of the chosen line into the space, then takes it from the inventory. */
  protected readonly stow = async (): Promise<void> => {
    const item = this.#item();
    const chosen = this.chosen();
    const line = this.#store.selected()?.document.inventory.items.find((each) => each.id === chosen);
    if (item === undefined || line === undefined) {
      return;
    }
    const coating = [...(item.state?.coating ?? []), line.item];
    await this.#store.patch({
      field: CharacterPatchField.SetItemState,
      id: item.id,
      state: { ...item.state, coating },
    });
    await (line.quantity > ONE
      ? this.#store.patch({
          field: CharacterPatchField.SetItemQuantity,
          id: line.id,
          quantity: ItemQuantity.parse(line.quantity - ONE),
        })
      : this.#store.patch({ field: CharacterPatchField.RemoveItem, id: line.id }));
    this.chosen.set(undefined);
  };

  /** Takes the stored item at `index` out of the space, then puts it back in the inventory. */
  protected readonly retrieve =
    (stored: Stored): (() => Promise<void>) =>
    async (): Promise<void> => {
      const item = this.#item();
      if (item === undefined) {
        return;
      }
      const coating = (item.state?.coating ?? []).filter((_each, index) => index !== stored.index);
      await this.#store.patch({
        field: CharacterPatchField.SetItemState,
        id: item.id,
        state: { ...item.state, coating },
      });
      await this.#store.patch({ field: CharacterPatchField.GiftItem, item: stored.item, quantity: ONE });
    };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
