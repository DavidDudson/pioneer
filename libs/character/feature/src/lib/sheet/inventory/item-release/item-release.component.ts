import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, hasAnimatedRune, InventoryItemId, releasedAttack } from '@pioneer/character/domain';
import type { InventoryItem, RunedContent } from '@pioneer/character/domain';
import { AsyncButton, Stack, Text } from '@pioneer/frontier';

import { CharacterStore } from '../../../data/character-store';
import { describeSaveError } from '../../sheet-field';

/**
 * One item with an animated rune: a button to set the weapon free to fight on its own, and to recall it, and while it
 * is free the attack modifier of the Strikes it makes. Shown only while the item has the rune.
 */
@Component({
  selector: 'pio-item-release',
  imports: [AsyncButton, Stack, Text, TranslocoPipe],
  templateUrl: './item-release.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemRelease {
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

  /** Whether the item has an animated rune, which is all that lets it be set free. */
  protected readonly animated = computed(() => {
    const item = this.#item();
    return item !== undefined && hasAnimatedRune(item, this.content().items.get(item.item), this.content().runes);
  });

  /** The attack modifier of the Strikes of the weapon while it is set free; none while it is not. */
  protected readonly attack = computed(() => {
    const item = this.#item();
    return item === undefined
      ? undefined
      : releasedAttack(item, this.content().items.get(item.item), this.content().runes);
  });

  protected readonly setFree = async (): Promise<void> =>
    this.#store.patch({ field: CharacterPatchField.SetItemState, id: this.id(), state: { released: true } });

  protected readonly recall = async (): Promise<void> =>
    this.#store.patch({ field: CharacterPatchField.SetItemState, id: this.id(), state: {} });

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
