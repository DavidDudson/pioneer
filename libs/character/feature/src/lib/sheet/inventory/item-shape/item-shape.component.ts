import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { hasShiftingRune, InventoryItemId, PlayCommandField, shapesFor } from '@pioneer/character/domain';
import type { InventoryItem, RunedContent } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Stack, Text } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { ContentId } from '@pioneer/rules/sdk';
import { PickerRows } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CharacterStore } from '../../../data/character-store';
import { PlayStore } from '../../../data/play-store';
import { describeSaveError } from '../../sheet-field';
import { SHAPE_ORDER, shapeColumns, shapeLabel, shapeValue } from './shape-picker';
import type { ShapeRow } from './shape-picker';

/** What the shift form submits: the weapon whose shape the item takes. */
const ShiftForm = z.object({ shape: ContentId });
interface ShiftModel {
  readonly shape: string;
}
const EMPTY_SHIFT: ShiftModel = { shape: '' };

/**
 * One item with a shifting rune: the weapon it has the shape of, a picker for another melee weapon that takes the
 * same number of hands, and a button to return it to its own shape. Shown only while the item has the rune.
 */
@Component({
  selector: 'pio-item-shape',
  imports: [AsyncButton, AsyncForm, FormField, PickerField, Stack, Text, TranslocoPipe],
  templateUrl: './item-shape.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemShape {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );

  /** Whether the item has a shifting rune, which is all that offers a shape. */
  protected readonly shifts = computed(() => {
    const item = this.#item();
    return item !== undefined && hasShiftingRune(item, this.content().items.get(item.item), this.content().runes);
  });

  /** The name of the weapon the item has the shape of; none while it has its own. */
  protected readonly shape: Signal<string | undefined> = computed(() => {
    const taken = this.#play.play.data()?.play.shapes[this.id()];
    return taken === undefined ? undefined : this.content().items.get(taken)?.name;
  });

  /** The weapons the item can take the shape of, by name. */
  protected readonly shapes = new PickerRows<ShapeRow>(
    computed((): readonly ShapeRow[] => {
      const item = this.#item();
      return item === undefined
        ? []
        : shapesFor(item, this.content()).map(({ id, name }): ShapeRow => ({ value: id, label: name }));
    }),
    SHAPE_ORDER,
  );
  protected readonly shapeColumns = computed(() => {
    this.#messages();
    return shapeColumns(this.#i18n.translate('character.sheet.shape.columnName'));
  });
  protected readonly shapeValue = shapeValue;
  protected readonly shapeLabel = shapeLabel;

  protected readonly model = signal<ShiftModel>(EMPTY_SHIFT);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, ShiftForm);
  });

  protected readonly shift = async (value: ShiftModel): Promise<void> => {
    const { shape } = ShiftForm.parse(value);
    await this.#play.send({ field: PlayCommandField.ShiftWeapon, item: this.id(), shape });
    this.model.set(EMPTY_SHIFT);
  };

  protected readonly reset = async (): Promise<void> =>
    this.#play.send({ field: PlayCommandField.ShiftWeapon, item: this.id() });

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
