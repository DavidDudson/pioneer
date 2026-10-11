import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField } from '@pioneer/character/domain';
import type { ItemContent } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncForm,
  Grid,
  Heading,
  LocaleFormat,
  NumberField,
  SelectField,
  Stack,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ComboboxField } from '@pioneer/frontier/data';
import type { ContentId } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../../data/character-store';
import { injectPlaceOptions } from '../place-options';
import { itemOptions, LOOSE } from '../sheet-inventory';
import { AddItemForm, EMPTY_ADD_ITEM } from './add-item-form';
import type { AddItemModel } from './add-item-form';

/**
 * Adds an item from content: pick it by name, say how many and where it goes. Inline under the inventory, never a
 * dialog; the buying shop with filters replaces the picker later (#288).
 */
@Component({
  selector: 'pio-add-item',
  imports: [
    AsyncButton,
    AsyncForm,
    ComboboxField,
    FormField,
    Grid,
    Heading,
    NumberField,
    SelectField,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './add-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddItem {
  /** The items the loaded packs offer. */
  public readonly content = input.required<ItemContent>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #query = signal('');

  protected readonly model = signal<AddItemModel>(EMPTY_ADD_ITEM);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, AddItemForm);
  });

  protected readonly items: Signal<readonly SelectOption<ContentId>[]> = computed(() =>
    itemOptions(this.content(), this.#query(), (left, right) => this.#format.compare(left, right)),
  );
  protected readonly places = injectPlaceOptions(this.content, signal(undefined));

  protected search(query: string): void {
    this.#query.set(query);
  }

  protected readonly add = async (value: AddItemModel): Promise<void> => {
    const { item, quantity, container } = AddItemForm.parse(value);
    await this.#store.patch({
      field: CharacterPatchField.AddItem,
      item,
      quantity,
      ...(container === LOOSE ? {} : { container }),
    });
    this.model.set(EMPTY_ADD_ITEM);
  };

  protected readonly describeError = (): string => this.#i18n.translate('character.sheet.inventory.addFailed');
}
