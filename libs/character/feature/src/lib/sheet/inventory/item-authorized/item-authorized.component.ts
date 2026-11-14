import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AuthorizedName,
  CharacterPatchField,
  hasAuthorizedRune,
  InventoryItemId,
  unauthorizedWielder,
} from '@pioneer/character/domain';
import type { AuthorizedDamage, Character, InventoryItem, RunedContent } from '@pioneer/character/domain';
import { Grid, InlineField, Stack, Text, TextInput } from '@pioneer/frontier';
import * as z from 'zod';

import { CharacterStore } from '../../../data/character-store';
import { sheetField } from '../../sheet-field';

/** The owner a player names, or none to say the weapon has no owner. */
const OwnerDraft = z.union([AuthorizedName, z.literal('')]);

/** The names of the other creatures allowed, as the player writes them: separated by commas. */
const OTHERS_MAX_LENGTH = 400;
const OthersDraft = z.string().max(OTHERS_MAX_LENGTH);

const SEPARATOR = ',';

/** The names in a comma-separated list, without the blank ones. */
function namesIn(list: string): readonly AuthorizedName[] {
  return list
    .split(SEPARATOR)
    .map((each) => each.trim())
    .filter((each) => each !== '')
    .map((each) => AuthorizedName.parse(each));
}

/**
 * One item with an authorized rune: who it was etched for (its owner, and the others the crafter allowed), and a
 * warning of the needles it drives into the character when they hold it and are not named. Shown only while the item
 * has the rune.
 */
@Component({
  selector: 'pio-item-authorized',
  imports: [Grid, InlineField, Stack, Text, TextInput, TranslocoPipe],
  templateUrl: './item-authorized.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemAuthorized {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);

  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );

  /** The character while it still has this item, so a removed item's fields go quiet. */
  readonly #holder: Signal<Character | undefined> = computed(() =>
    this.#item() === undefined ? undefined : this.#store.selected(),
  );

  /** Whether the item has an authorized rune, which is all that gives it an owner. */
  protected readonly authorized = computed(() => {
    const item = this.#item();
    return item !== undefined && hasAuthorizedRune(item, this.content().items.get(item.item), this.content().runes);
  });

  /** Whether an owner is named, which the other names go with. */
  protected readonly named = computed((): boolean => this.#item()?.state?.authorized !== undefined);

  /** What the needles do to the character who holds the weapon, when they are not named; undefined when they are safe. */
  protected readonly harm: Signal<AuthorizedDamage | undefined> = computed(() => {
    const item = this.#item();
    const wielder = this.#store.selected()?.document.name;
    return item === undefined || wielder === undefined
      ? undefined
      : unauthorizedWielder(item, this.content().items.get(item.item), { runes: this.content().runes, wielder });
  });

  protected readonly owner = sheetField<string>(this.#holder, {
    read: () => this.#item()?.state?.authorized?.owner ?? '',
    empty: '',
    schema: OwnerDraft,
    save: async (value) => {
      const item = this.#item();
      if (item === undefined) {
        return;
      }
      const { authorized: previous, ...rest } = item.state ?? {};
      const owner = OwnerDraft.parse(value);
      await this.#store.patch({
        field: CharacterPatchField.SetItemState,
        id: item.id,
        state: owner === '' ? rest : { ...rest, authorized: { owner, others: previous?.others ?? [] } },
      });
    },
  });

  protected readonly others = sheetField<string>(this.#holder, {
    read: () => (this.#item()?.state?.authorized?.others ?? []).join(`${SEPARATOR} `),
    empty: '',
    schema: OthersDraft,
    save: async (value) => {
      const item = this.#item();
      const previous = item?.state?.authorized;
      if (item === undefined || previous === undefined) {
        return;
      }
      await this.#store.patch({
        field: CharacterPatchField.SetItemState,
        id: item.id,
        state: { ...item.state, authorized: { owner: previous.owner, others: namesIn(OthersDraft.parse(value)) } },
      });
    },
  });
}
