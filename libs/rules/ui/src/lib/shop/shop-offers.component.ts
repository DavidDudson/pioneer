import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePackageSearch } from '@lucide/angular';
import { EmptyState, List, ListItem, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { priceCoins, RARITY_BADGES, ShopMessage } from './shop-offer';
import type { RarityBadge, ShopOffer } from './shop-offer';
import { ShopOfferRow } from './shop-offer-row/shop-offer-row.component';

/** How many offers the list shows; past it, the player narrows the filters. */
const SHOWN_MAX = 50;
/** Placeholder rows while the items load. */
const LOADING_ROWS = [0, 1, 2];

/** An offer as its row shows it: the price and level already in the UI locale. */
interface OfferRow {
  readonly offer: ShopOffer;
  readonly badge: RarityBadge | undefined;
  readonly line: string;
}

/**
 * The items a shop offers, by name, each with its rarity badge (uncommon, rare, unique), level and price, and a toggle
 * to pick it. One item is picked at a time; picking another moves the pick. Shows the first `SHOWN_MAX` and says how
 * many more there are, so the list stays short on a phone. `offers` is undefined while the items load.
 */
@Component({
  selector: 'pio-shop-offers',
  imports: [EmptyState, List, ListItem, ShopOfferRow, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './shop-offers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopOffersView {
  public readonly offers = input<readonly ShopOffer[] | undefined>();
  public readonly picked = model<ContentId | undefined>(undefined);

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Re-read when the messages load or the language changes, so a row is never a raw key. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly Message = ShopMessage;
  protected readonly emptyIcon = LucidePackageSearch;
  protected readonly loadingRows = LOADING_ROWS;

  protected readonly rows: Signal<readonly OfferRow[]> = computed(() => {
    this.#messages();
    return (this.offers() ?? []).slice(0, SHOWN_MAX).map((offer) => {
      const price = this.#priceText(offer);
      return {
        offer,
        badge: RARITY_BADGES[offer.rarity],
        line:
          offer.level === undefined
            ? this.#i18n.translate(ShopMessage.LineNoLevel, { price })
            : this.#i18n.translate(ShopMessage.Line, { level: this.#format.number(offer.level), price }),
      };
    });
  });

  protected readonly hidden = computed(() => (this.offers()?.length ?? 0) - this.rows().length);

  protected number(value: number): string {
    return this.#format.number(value);
  }

  protected pick(id: ContentId, on: boolean): void {
    this.picked.set(on ? id : undefined);
  }

  #priceText({ price }: ShopOffer): string {
    if (price === undefined) {
      return this.#i18n.translate(ShopMessage.NoPrice);
    }
    const coins = priceCoins(price)
      .map(({ coin, count }) => this.#i18n.translate(ShopMessage.Coin, { coin, count: this.#format.number(count) }))
      .join(' ');
    return price.per === undefined
      ? coins
      : this.#i18n.translate(ShopMessage.PricePer, { price: coins, per: this.#format.number(price.per) });
  }
}
