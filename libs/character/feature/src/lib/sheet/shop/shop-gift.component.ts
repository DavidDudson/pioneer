import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField } from '@pioneer/character/domain';
import type { ItemContent, ItemEntry } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Grid, Heading, NumberField, SelectField, Stack } from '@pioneer/frontier';

import { CharacterStore } from '../../data/character-store';
import { injectPlaceOptions } from '../inventory/place-options';
import { LOOSE } from '../inventory/sheet-inventory';
import { EMPTY_GIFT, ShopGiftForm } from './shop-gift-form';
import type { ShopGiftModel } from './shop-gift-form';

/**
 * The item picked in the shop, with how many and where they go, and **Add without paying**: a `giftItem`, so no coins
 * move (loot, a GM's reward, starting gear). Buying goes beside it (#289). Inline under the list, never a dialog.
 */
@Component({
  selector: 'pio-shop-gift',
  imports: [AsyncButton, AsyncForm, FormField, Grid, Heading, NumberField, SelectField, Stack, TranslocoPipe],
  templateUrl: './shop-gift.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopGift {
  /** The items the loaded packs offer, for the containers the item can go in. */
  public readonly content = input.required<ItemContent>();
  public readonly item = input.required<ItemEntry>();
  /** The item was added. */
  public readonly gifted = output();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly model = signal<ShopGiftModel>(EMPTY_GIFT);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, ShopGiftForm);
  });
  protected readonly places = injectPlaceOptions(this.content, signal(undefined));
  protected readonly name: Signal<string> = computed(() => this.item().name);

  protected readonly gift = async (value: ShopGiftModel): Promise<void> => {
    const { quantity, container } = ShopGiftForm.parse(value);
    await this.#store.patch({
      field: CharacterPatchField.GiftItem,
      item: this.item().id,
      quantity,
      ...(container === LOOSE ? {} : { container }),
    });
    this.model.set(EMPTY_GIFT);
    this.gifted.emit();
  };

  protected readonly describeError = (): string => this.#i18n.translate('character.sheet.shop.giftFailed');
}
