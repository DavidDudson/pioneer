import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DescriptionItem, DescriptionList, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { coinsText, ShopBillFor, ShopMessage } from '../shop-offer';
import type { CoinCount } from '../shop-offer';

/** Why the coins fall short, by what the bill is for. */
const UNAFFORDABLE: Readonly<Record<ShopBillFor, string>> = {
  [ShopBillFor.Item]: ShopMessage.CannotAfford,
  [ShopBillFor.Kit]: ShopMessage.CannotAffordKit,
};

/**
 * What buying the picked item or kit costs and what the character has to pay with, each in coins, largest first;
 * when they can't afford it, why, under `reasonId` so the Buy button can point at it.
 */
@Component({
  selector: 'pio-shop-bill',
  imports: [DescriptionItem, DescriptionList, Stack, Text, TranslocoPipe],
  templateUrl: './shop-bill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopBill {
  /** The cost of the quantity picked; none for an item with no price. */
  public readonly cost = input.required<readonly CoinCount[]>();
  /** The character's coins; none when they have no coins. */
  public readonly coins = input.required<readonly CoinCount[]>();
  public readonly affordable = input.required<boolean>();
  /** Id of the reason shown when they can't afford it. */
  public readonly reasonId = input.required<string>();
  /** What the bill is for: an item, whose quantity can drop, or a kit, which can only be added without paying. */
  public readonly subject = input<ShopBillFor>(ShopBillFor.Item);

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Re-read when the messages load or the language changes, so a line is never a raw key. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly Message = ShopMessage;
  protected readonly reason: Signal<string> = computed(() => UNAFFORDABLE[this.subject()]);

  protected readonly costText: Signal<string> = computed(() => {
    this.#messages();
    const cost = this.cost();
    return cost.length === 0 ? this.#i18n.translate(ShopMessage.Free) : this.#text(cost);
  });

  protected readonly coinsText: Signal<string> = computed(() => {
    this.#messages();
    const coins = this.coins();
    return coins.length === 0 ? this.#i18n.translate(ShopMessage.NoCoins) : this.#text(coins);
  });

  #text(counts: readonly CoinCount[]): string {
    return coinsText(counts, (coin, count) =>
      this.#i18n.translate(ShopMessage.Coin, { coin, count: this.#format.number(count) }),
    );
  }
}
