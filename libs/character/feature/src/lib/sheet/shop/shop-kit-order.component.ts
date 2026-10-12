import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, costCoins, ItemQuantity, payCost, purchaseCost } from '@pioneer/character/domain';
import type { CharacterPatch, ItemContent, KitEntry } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Heading, SelectField, Stack } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import { coinCounts, KitContents, ShopBill, ShopBillFor } from '@pioneer/rules/ui';
import type { CoinCount, KitLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectPlaceOptions } from '../inventory/place-options';
import { LOOSE } from '../inventory/sheet-inventory';
import { describeSaveError } from '../sheet-field';
import { EMPTY_KIT_ORDER, ShopKitOrderForm } from './shop-order-form';
import type { ShopKitOrderModel } from './shop-order-form';

/** A kit is bought one at a time, at its price. */
const ONE_KIT = ItemQuantity.parse(1);

/** What the bill shows: the kit's price, the character's coins, and whether they cover it. */
interface Bill {
  readonly cost: readonly CoinCount[];
  readonly coins: readonly CoinCount[];
  readonly affordable: boolean;
}

/**
 * The kit picked in the shop: what it holds, where it goes, what it costs against the character's coins, and two ways
 * to take it, each adding every item at once: **Buy**, a `buyKit` that pays the kit's price with change made and is
 * disabled, with the reason, when the coins fall short; and **Add without paying**, a `giftKit` (starting gear). Inline
 * under the kits, never a dialog.
 */
@Component({
  selector: 'pio-shop-kit-order',
  imports: [AsyncButton, AsyncForm, FormField, Heading, KitContents, SelectField, ShopBill, Stack, TranslocoPipe],
  templateUrl: './shop-kit-order.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopKitOrder {
  /** The items the loaded packs offer, for the names of what the kit holds and the containers it can go in. */
  public readonly content = input.required<ItemContent>();
  public readonly kit = input.required<KitEntry>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly model = signal<ShopKitOrderModel>(EMPTY_KIT_ORDER);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, ShopKitOrderForm);
  });
  protected readonly places = injectPlaceOptions(this.content, signal(undefined));
  protected readonly name: Signal<string> = computed(() => this.kit().name);
  protected readonly billFor = ShopBillFor.Kit;
  /** One kit order shows at a time, for one kit, so its id names the reason. */
  protected readonly reasonId: Signal<string> = computed(() => `pio-shop-kit-order-reason-${this.kit().id}`);

  /** What the kit holds, by the names content gives its items. */
  protected readonly lines: Signal<readonly KitLine[]> = computed(() => {
    const content = this.content();
    const named = (item: ContentId, quantity: number, contents: readonly KitLine[]): KitLine => ({
      name: content.get(item)?.name ?? item,
      quantity,
      contents,
    });
    return this.kit().data.items.map(({ item, quantity, contents = [] }) =>
      named(
        item,
        quantity,
        contents.map((inner) => named(inner.item, inner.quantity, [])),
      ),
    );
  });

  /** Undefined while the character loads. */
  protected readonly bill: Signal<Bill | undefined> = computed(() => {
    const coins = this.#store.selected()?.document.inventory.coins;
    if (coins === undefined) {
      return undefined;
    }
    const cost = purchaseCost(this.kit().data.price, ONE_KIT);
    return {
      cost: coinCounts(costCoins(cost)),
      coins: coinCounts(coins),
      affordable: payCost(coins, cost) !== undefined,
    };
  });
  protected readonly affordable: Signal<boolean> = computed(() => this.bill()?.affordable ?? true);

  protected readonly buy = async (value: ShopKitOrderModel): Promise<void> => {
    await this.#order(CharacterPatchField.BuyKit, value);
  };

  private readonly orderForm = viewChild.required(AsyncForm);
  /** A purchase is in flight: the gift waits, so the two never race on one version. */
  protected readonly buying: Signal<boolean> = computed(() => this.orderForm().submission.isPending());
  /** A gift is in flight: Buy waits, likewise. */
  protected readonly gifting = signal(false);

  protected readonly gift = async (): Promise<void> => {
    this.gifting.set(true);
    try {
      await this.#order(CharacterPatchField.GiftKit, this.model());
    } finally {
      this.gifting.set(false);
    }
  };

  /** The server's reason (coins that no longer cover the price, a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #order(
    field: typeof CharacterPatchField.BuyKit | typeof CharacterPatchField.GiftKit,
    value: ShopKitOrderModel,
  ): Promise<void> {
    const { container } = ShopKitOrderForm.parse(value);
    const patch: CharacterPatch = { field, kit: this.kit().id, ...(container === LOOSE ? {} : { container }) };
    await this.#store.patch(patch);
    this.model.set(EMPTY_KIT_ORDER);
  }
}
