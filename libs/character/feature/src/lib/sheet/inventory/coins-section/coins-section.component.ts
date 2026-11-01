import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Stack } from '@pioneer/frontier';

import { CoinOffer } from '../coin-offer/coin-offer.component';
import { CoinsEdit } from '../coins-edit/coins-edit.component';

/** The character's coins under their heading: the purse to edit, and the offer of some of it to the party. */
@Component({
  selector: 'pio-coins-section',
  imports: [CoinOffer, CoinsEdit, Heading, Stack, TranslocoPipe],
  templateUrl: './coins-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsSection {}
