import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterPatchField,
  InventoryItemId,
  InventoryItemName,
  isInvestable,
  ItemQuantity,
  STOWED,
} from '@pioneer/character/domain';
import type { Character, InventoryItem, ItemContent, ItemEntry } from '@pioneer/character/domain';
import {
  AsyncButton,
  Grid,
  InlineField,
  LocaleFormat,
  NumberInput,
  Select,
  Stack,
  TextInput,
  ToggleButton,
} from '@pioneer/frontier';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CharacterStore } from '../../../data/character-store';
import { sheetField } from '../../sheet-field';
import { CarryChoice, carryOf, choiceOf, injectCarryOptions } from '../carry-options';
import { injectPlaceOptions } from '../place-options';
import { LOOSE } from '../sheet-inventory';

/** A name the player gives, or none to go back to the content's. */
const NameDraft = z.union([InventoryItemName, z.literal('')]);
const PlaceDraft = z.union([InventoryItemId, z.literal(LOOSE)]);
const CarryDraft = z.enum(CarryChoice);
const InvestedDraft = z.boolean();

const NO_QUANTITY = 1;

/** The invest field's read view, invested or not. */
interface InvestLabels {
  readonly on: string;
  readonly off: string;
}

/**
 * One item's edits beside it on the sheet: how many, the player's name for it, the container it is in, how it is
 * carried and, for an item with the invested trait, whether it is invested, each its own inline edit, and Remove. Every label names the item, so each row's controls read apart. Removing acts on the first
 * press when adding the item again would put it back; it asks for a second press only when the item has the player's
 * name or holds something, which adding it again can't restore (interaction rule 4).
 */
@Component({
  selector: 'pio-item-edits',
  imports: [AsyncButton, Grid, InlineField, NumberInput, Select, Stack, TextInput, ToggleButton, TranslocoPipe],
  templateUrl: './item-edits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemEdits {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items the loaded packs offer, to tell which items are containers. */
  public readonly content = input.required<ItemContent>();

  readonly #store = inject(CharacterStore);
  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  /** "Invested" and "Not invested", re-read when the language changes or the messages load. */
  readonly #investLabels = computed((): InvestLabels => {
    this.#messages();
    return {
      on: this.#i18n.translate('character.sheet.inventory.invested'),
      off: this.#i18n.translate('character.sheet.inventory.notInvested'),
    };
  });
  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );
  /** The character while it still has this item, so a removed item's fields go quiet. */
  readonly #holder: Signal<Character | undefined> = computed(() =>
    this.#item() === undefined ? undefined : this.#store.selected(),
  );

  readonly #entry: Signal<ItemEntry | undefined> = computed(() => {
    const item = this.#item();
    return item === undefined ? undefined : this.content().get(item.item);
  });

  protected readonly places = injectPlaceOptions(this.content, this.id);
  protected readonly carries = injectCarryOptions(this.#entry);
  /**
   * Whether investing is offered: the item works only invested (the invested trait, or armour with runes), or it is
   * invested already, as armour stays once its last rune is erased or moved, so its slot can be freed.
   */
  protected readonly investable = computed(() => {
    const item = this.#item();
    return isInvestable(item, this.#entry()) || item?.invested === true;
  });
  /** Whether removing loses what adding again can't restore: the player's name, or where its contents were. */
  protected readonly lossy = computed((): boolean => {
    const item = this.#item();
    const holds = this.#store.selected()?.document.inventory.items.some((each) => each.container === this.id());
    return item?.name !== undefined || holds === true;
  });

  protected readonly quantity = sheetField<number>(this.#holder, {
    read: () => this.#item()?.quantity ?? NO_QUANTITY,
    empty: NO_QUANTITY,
    schema: ItemQuantity,
    save: async (value) =>
      this.#store.patch({
        field: CharacterPatchField.SetItemQuantity,
        id: this.id(),
        quantity: ItemQuantity.parse(value),
      }),
    format: (value) => this.#format.number(value),
  });
  protected readonly rename = sheetField<string>(this.#holder, {
    read: () => this.#item()?.name ?? '',
    empty: '',
    schema: NameDraft,
    save: async (value) => {
      const name = NameDraft.parse(value);
      await this.#store.patch({
        field: CharacterPatchField.RenameItem,
        id: this.id(),
        ...(name === '' ? {} : { name }),
      });
    },
  });
  protected readonly place = sheetField<string | undefined>(this.#holder, {
    read: () => this.#item()?.container ?? LOOSE,
    empty: LOOSE,
    schema: PlaceDraft,
    save: async (value) => {
      const container = PlaceDraft.parse(value ?? LOOSE);
      await this.#store.patch({
        field: CharacterPatchField.MoveItem,
        id: this.id(),
        ...(container === LOOSE ? {} : { container }),
      });
    },
    format: (value) => this.places().find((option) => option.value === value)?.label ?? '',
  });

  protected readonly carry = sheetField<string | undefined>(this.#holder, {
    read: () => choiceOf(this.#item()?.carry ?? STOWED),
    empty: CarryChoice.Stowed,
    schema: CarryDraft,
    save: async (value) =>
      this.#store.patch({
        field: CharacterPatchField.CarryItem,
        id: this.id(),
        carry: carryOf(CarryDraft.parse(value)),
      }),
    format: (value) => this.carries().find((option) => option.value === value)?.label ?? '',
  });
  protected readonly invest = sheetField<boolean>(this.#holder, {
    read: () => this.#item()?.invested === true,
    empty: false,
    schema: InvestedDraft,
    save: async (value) =>
      this.#store.patch({ field: CharacterPatchField.InvestItem, id: this.id(), invested: InvestedDraft.parse(value) }),
    format: (value) => this.#investLabels()[value ? 'on' : 'off'],
  });

  protected readonly remove = async (): Promise<void> => {
    await this.#store.patch({ field: CharacterPatchField.RemoveItem, id: this.id() });
  };
}
