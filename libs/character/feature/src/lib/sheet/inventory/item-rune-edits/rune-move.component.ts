import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, InventoryItemId, runedItemOf } from '@pioneer/character/domain';
import type { InventoryItem, RunedContent, RuneRef } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Stack } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { RunedItem } from '@pioneer/rules/sdk';
import { PickerRows } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CharacterStore } from '../../../data/character-store';
import { injectItemNames } from '../item-names';
import { etchedRunes, runeKey, runeOfKey, transferTargets } from './rune-options';
import {
  etchedRows,
  RUNE_ORDER,
  runeColumns,
  runeRowLabel,
  runeValue,
  slotsOf,
  TARGET_ORDER,
  targetColumns,
  targetRowLabel,
  targetValue,
} from './rune-picker';
import type { RuneRow, RuneTargetRow } from './rune-picker';
import { describeRuneError } from './rune-text';

/** What the move form submits: the rune, by its key, and the item it goes onto. */
const MoveRuneForm = z.object({ rune: z.string().min(1), to: InventoryItemId });
interface MoveRuneModel {
  readonly rune: string;
  readonly to: string;
}
const EMPTY_MOVE: MoveRuneModel = { rune: '', to: '' };

/** Each kind of item a rune goes on, spelled out so the message check sees every key. */
const ITEM_KIND_KEYS: Readonly<Record<RunedItem, string>> = {
  [RunedItem.Weapon]: 'character.sheet.runes.itemKind.weapon',
  [RunedItem.Armor]: 'character.sheet.runes.itemKind.armor',
  [RunedItem.Shield]: 'character.sheet.runes.itemKind.shield',
};

/**
 * A form to move a rune etched onto one weapon, armour or shield onto another of the same kind, shown while the item
 * has a rune to move and somewhere to move it. A specific item's runes are its own, so they never move.
 */
@Component({
  selector: 'pio-rune-move',
  imports: [AsyncButton, AsyncForm, FormField, PickerField, Stack, TranslocoPipe],
  templateUrl: './rune-move.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuneMove {
  /** The inventory item the rune moves off. */
  public readonly id = input.required<InventoryItemId>();
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );
  readonly #etched: Signal<readonly RuneRef[]> = computed(() => {
    const item = this.#item();
    return item === undefined ? [] : etchedRunes(item, this.content().items.get(item.item));
  });

  readonly #words = computed(() => {
    this.#messages();
    return {
      fundamental: this.#i18n.translate('character.sheet.runes.kind.fundamental'),
      property: this.#i18n.translate('character.sheet.runes.kind.property'),
    };
  });

  /** The runes etched onto the item, as rows with their level, effect and price. */
  protected readonly runes = new PickerRows<RuneRow>(
    computed(() => {
      const item = this.#item();
      const entry = item === undefined ? undefined : this.content().items.get(item.item);
      return etchedRows(
        this.content(),
        { item, entry, runes: this.#etched(), key: runeKey },
        { i18n: this.#i18n, words: this.#words() },
      );
    }),
    RUNE_ORDER,
  );
  protected readonly runeColumns = computed(() => {
    this.#messages();
    return runeColumns({
      name: this.#i18n.translate('character.sheet.runes.columns.name'),
      kind: this.#i18n.translate('character.sheet.runes.columns.kind'),
      level: this.#i18n.translate('character.sheet.runes.columns.level'),
      effect: this.#i18n.translate('character.sheet.runes.columns.effect'),
      price: this.#i18n.translate('character.sheet.runes.columns.price'),
      slots: this.#i18n.translate('character.sheet.runes.columns.slots'),
      slotsUsed: this.#i18n.translate('character.sheet.runes.columns.slotsUsed'),
    });
  });
  protected readonly runeValue = runeValue;
  protected readonly runeLabel = runeRowLabel;

  readonly #names = injectItemNames(this.content);

  /** The items the rune can move onto, by the names their rows show, so two longswords read apart, with their open slots. */
  protected readonly targets = new PickerRows<RuneTargetRow>(
    computed((): readonly RuneTargetRow[] => {
      this.#messages();
      const character = this.#store.selected();
      const names = this.#names();
      if (character === undefined) {
        return [];
      }
      const { inventory } = character.document;
      return transferTargets(inventory, this.content(), this.id()).flatMap((id): RuneTargetRow[] => {
        const item = inventory.items.find((each) => each.id === id);
        const entry = item === undefined ? undefined : this.content().items.get(item.item);
        const runed = runedItemOf(entry);
        return item === undefined || runed === undefined
          ? []
          : [
              {
                value: id,
                label: names.get(id) ?? id,
                kind: this.#i18n.translate(ITEM_KIND_KEYS[runed]),
                ...slotsOf(item, entry),
              },
            ];
      });
    }),
    TARGET_ORDER,
  );
  protected readonly targetColumns = computed(() => {
    this.#messages();
    return targetColumns({
      name: this.#i18n.translate('character.sheet.runes.targetColumns.name'),
      kind: this.#i18n.translate('character.sheet.runes.targetColumns.kind'),
      slots: this.#i18n.translate('character.sheet.runes.targetColumns.slots'),
      slotsUsed: this.#i18n.translate('character.sheet.runes.targetColumns.slotsUsed'),
    });
  });
  protected readonly targetValue = targetValue;
  protected readonly targetLabel = targetRowLabel;

  protected readonly model = signal<MoveRuneModel>(EMPTY_MOVE);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, MoveRuneForm);
  });

  protected readonly move = async (value: MoveRuneModel): Promise<void> => {
    const { rune: key, to } = MoveRuneForm.parse(value);
    const rune = runeOfKey(key, this.#etched());
    if (rune === undefined) {
      return;
    }
    await this.#store.patch({ field: CharacterPatchField.TransferRune, id: this.id(), to, rune });
    this.model.set(EMPTY_MOVE);
  };

  protected readonly describeError = (error: unknown): string => describeRuneError(this.#i18n, error);
}
