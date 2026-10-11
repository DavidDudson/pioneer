import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, InventoryItemId } from '@pioneer/character/domain';
import type { InventoryItem, RunedContent, RuneRef } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, SelectField, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { RuneType } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CharacterStore } from '../../../data/character-store';
import { etchedRunes, runeKey, runeOfKey, transferTargets } from './rune-options';
import { describeRuneError, runeLabel } from './rune-text';

/** What the move form submits: the rune, by its key, and the item it goes onto. */
const MoveRuneForm = z.object({ rune: z.string().min(1), to: InventoryItemId });
interface MoveRuneModel {
  readonly rune: string;
  readonly to: string;
}
const EMPTY_MOVE: MoveRuneModel = { rune: '', to: '' };

/**
 * A form to move a rune etched onto one weapon, armour or shield onto another of the same kind, shown while the item
 * has a rune to move and somewhere to move it. A specific item's runes are its own, so they never move.
 */
@Component({
  selector: 'pio-rune-move',
  imports: [AsyncButton, AsyncForm, FormField, SelectField, Stack, TranslocoPipe],
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

  protected readonly runes: Signal<readonly SelectOption<string>[]> = computed(() => {
    this.#messages();
    const item = this.#item();
    return this.#etched().map((rune) => ({
      value: runeKey(rune),
      label: runeLabel(this.#i18n, this.content(), {
        rune,
        grade: rune.type === RuneType.Fundamental ? item?.runes?.[rune.rune] : undefined,
      }),
    }));
  });

  protected readonly targets: Signal<readonly SelectOption<InventoryItemId>[]> = computed(() => {
    const character = this.#store.selected();
    return character === undefined ? [] : transferTargets(character.document.inventory, this.content(), this.id());
  });

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
