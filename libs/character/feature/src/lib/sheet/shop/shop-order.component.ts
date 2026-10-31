import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, costCoins, ItemQuantity, payCost, purchaseCost } from '@pioneer/character/domain';
import type { CharacterPatch, ItemContent, ItemEntry } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Grid, Heading, NumberField, Stack } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { coinCounts, ShopBill } from '@pioneer/rules/ui';
import type { CoinCount } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectPlacePicker } from '../inventory/place-picker';
import { LOOSE } from '../inventory/sheet-inventory';
import { describeSaveError } from '../sheet-field';
import { EMPTY_ORDER, ShopOrderForm } from './shop-order-form';
import type { ShopOrderModel } from './shop-order-form';

/** What the bill shows: the cost of the quantity picked, the character's coins, and whether they cover it. */
interface Bill {
  readonly cost: readonly CoinCount[];
  readonly coins: readonly CoinCount[];
  readonly affordable: boolean;
}

/**
 * The item picked in the shop, with how many and where they go, what that costs against the character's coins, and
 * two ways to take it: **Buy**, a `buyItem` that pays with change made and is disabled, with the reason, when the coins
 * fall short; and **Add without paying**, a `giftItem` (loot, a GM's reward, starting gear). Inline under the list,
 * never a dialog.
 */
@Component({
  selector: 'pio-shop-order',
  imports: [AsyncButton, AsyncForm, FormField, Grid, Heading, NumberField, PickerField, ShopBill, Stack, TranslocoPipe],
  templateUrl: './shop-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopOrder {
  /** The items the loaded packs offer, for the containers the item can go in. */
  public readonly content = input.required<ItemContent>();
  public readonly item = input.required<ItemEntry>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly model = signal<ShopOrderModel>(EMPTY_ORDER);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, ShopOrderForm);
  });
  protected readonly places = injectPlacePicker(this.content, signal(undefined));
  protected readonly name: Signal<string> = computed(() => this.item().name);
  /** One order form shows at a time, for one item, so its id names the reason. */
  protected readonly reasonId: Signal<string> = computed(() => `pio-shop-order-reason-${this.item().id}`);

  /** Undefined while the character loads or the quantity is not one the server takes. */
  protected readonly bill: Signal<Bill | undefined> = computed(() => {
    const coins = this.#store.selected()?.document.inventory.coins;
    const quantity = ItemQuantity.safeParse(this.model().quantity);
    if (coins === undefined || !quantity.success) {
      return undefined;
    }
    const cost = purchaseCost(this.item().data.price, quantity.data);
    return {
      cost: coinCounts(costCoins(cost)),
      coins: coinCounts(coins),
      affordable: payCost(coins, cost) !== undefined,
    };
  });
  protected readonly affordable: Signal<boolean> = computed(() => this.bill()?.affordable ?? true);

  protected readonly buy = async (value: ShopOrderModel): Promise<void> => {
    await this.#order(CharacterPatchField.BuyItem, value);
  };

  private readonly orderForm = viewChild.required(AsyncForm);
  /** A purchase is in flight: the gift waits, so the two never race on one version. */
  protected readonly buying: Signal<boolean> = computed(() => this.orderForm().submission.isPending());
  /** A gift is in flight: Buy waits, likewise. */
  protected readonly gifting = signal(false);

  /** Beside the form's submit, so it runs only while the form is valid. */
  protected readonly gift = async (): Promise<void> => {
    this.gifting.set(true);
    try {
      await this.#order(CharacterPatchField.GiftItem, this.model());
    } finally {
      this.gifting.set(false);
    }
  };

  /** The server's reason (coins that no longer cover the cost, a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #order(
    field: typeof CharacterPatchField.BuyItem | typeof CharacterPatchField.GiftItem,
    value: ShopOrderModel,
  ): Promise<void> {
    const { quantity, container } = ShopOrderForm.parse(value);
    const patch: CharacterPatch = {
      field,
      item: this.item().id,
      quantity,
      ...(container === LOOSE ? {} : { container }),
    };
    await this.#store.patch(patch);
    this.model.set(EMPTY_ORDER);
  }
}
