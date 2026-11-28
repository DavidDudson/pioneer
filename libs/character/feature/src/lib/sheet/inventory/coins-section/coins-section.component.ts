import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Stack } from '@pioneer/frontier';

import { CoinLedger } from '../coin-ledger/coin-ledger.component';
import { CoinLoot } from '../coin-loot/coin-loot.component';
import { CoinOffer } from '../coin-offer/coin-offer.component';
import { CoinSimplify } from '../coin-simplify/coin-simplify.component';
import { CoinsEdit } from '../coins-edit/coins-edit.component';

/** The character's coins under their heading: the purse to edit, and the offer of some of it to the party. */
@Component({
  selector: 'pio-coins-section',
  imports: [CoinLedger, CoinLoot, CoinOffer, CoinSimplify, CoinsEdit, Heading, Stack, TranslocoPipe],
  templateUrl: './coins-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsSection {}
