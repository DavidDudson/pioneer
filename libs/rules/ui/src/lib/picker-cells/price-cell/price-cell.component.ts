import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Stack, Text } from '@pioneer/frontier';
import type { Price } from '@pioneer/rules/sdk';

import { priceCoins, ShopMessage } from '../../shop/shop-offer';
import { PickerCellMessage } from '../picker-cell-messages';

/**
 * An item's price as coins, largest first ("3 gp 5 sp"), with how many it buys ("per 10"). No price shows "No price".
 *
 * ```html
 * <pio-price-cell [price]="item.price" />
 * ```
 */
@Component({
  selector: 'pio-price-cell',
  imports: [Stack, Text, TranslocoPipe],
  templateUrl: './price-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceCell {
  /** Undefined for an item with no price. */
  public readonly price = input.required<Price | undefined>();

  readonly #format = inject(LocaleFormat);
  protected readonly Message = { ...ShopMessage, ...PickerCellMessage };

  protected readonly coins = computed(() => {
    const price = this.price();
    return price === undefined
      ? []
      : priceCoins(price).map(({ coin, count }) => ({ coin, count: this.#format.number(count) }));
  });
  protected readonly per = computed(() => {
    const per = this.price()?.per;
    return per === undefined ? undefined : this.#format.number(per);
  });
}
