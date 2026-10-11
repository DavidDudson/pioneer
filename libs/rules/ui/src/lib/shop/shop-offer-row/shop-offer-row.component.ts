import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text, ToggleButton } from '@pioneer/frontier';

import { ShopMessage } from '../shop-offer';
import type { RarityBadge, ShopOffer } from '../shop-offer';

/** One offer of `pio-shop-offers`: its name, rarity badge, level and price, and the toggle that picks it. */
@Component({
  selector: 'pio-shop-offer-row',
  imports: [Badge, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './shop-offer-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopOfferRow {
  public readonly offer = input.required<ShopOffer>();
  public readonly badge = input<RarityBadge | undefined>();
  /** "Level 3 · 60 gp 5 sp", in the UI locale. */
  public readonly line = input.required<string>();
  public readonly picked = input(false);
  /** The toggle was pressed: on to pick this offer, off to unpick it. */
  public readonly pickedChange = output<boolean>();

  protected readonly Message = ShopMessage;
}
