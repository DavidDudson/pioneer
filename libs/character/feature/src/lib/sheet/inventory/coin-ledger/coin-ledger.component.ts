import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { coinsValue, LedgerReason } from '@pioneer/character/domain';
import type { LedgerEntry } from '@pioneer/character/domain';
import { DateDisplay, DateFormat, Heading, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { Coin, COPPER_PER_COIN } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../../data/character-store';

/** Why the coins changed, as the message that says so. */
const REASON_MESSAGES: Readonly<Record<LedgerReason, string>> = {
  [LedgerReason.Opening]: 'character.sheet.inventory.ledger.reason.opening',
  [LedgerReason.Purchase]: 'character.sheet.inventory.ledger.reason.purchase',
  [LedgerReason.Adjustment]: 'character.sheet.inventory.ledger.reason.adjustment',
  [LedgerReason.Transfer]: 'character.sheet.inventory.ledger.reason.transfer',
};

/** Each coin's short name, as an amount is written. */
const COIN_MESSAGES: Readonly<Record<Coin, string>> = {
  [Coin.Platinum]: 'character.sheet.inventory.ledger.coin.pp',
  [Coin.Gold]: 'character.sheet.inventory.ledger.coin.gp',
  [Coin.Silver]: 'character.sheet.inventory.ledger.coin.sp',
  [Coin.Copper]: 'character.sheet.inventory.ledger.coin.cp',
};

/** One coin's part of an entry: its short name and the signed amount, as text. */
interface AmountRow {
  readonly coin: string;
  readonly amount: string;
}

/** One ledger entry as the section shows it. */
interface EntryRow {
  readonly reason: string;
  readonly amounts: readonly AmountRow[];
  readonly at: Temporal.Instant | undefined;
}

/** The Wealth section: what the coins are worth in gold and every change to them, newest first. */
@Component({
  selector: 'pio-coin-ledger',
  imports: [DateDisplay, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './coin-ledger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinLedger {
  readonly #store = inject(CharacterStore);
  readonly #format = inject(LocaleFormat);

  protected readonly dateFormat = DateFormat.DateTime;

  /** What the purse is worth, in gold. */
  protected readonly total = computed(() => {
    const coins = this.#store.selected()?.document.inventory.coins;
    const copper = coins === undefined ? 0 : coinsValue(coins);

    return this.#format.number(copper / COPPER_PER_COIN[Coin.Gold]);
  });

  protected readonly rows = computed((): readonly EntryRow[] =>
    (this.#store.selected()?.document.inventory.ledger ?? []).map((entry) => this.#row(entry)).toReversed(),
  );

  #row(entry: LedgerEntry): EntryRow {
    const amounts = Object.values(Coin)
      .filter((coin) => entry.change[coin] !== 0)
      .map((coin) => ({
        coin: COIN_MESSAGES[coin],
        amount: this.#format.number(entry.change[coin], { signDisplay: 'exceptZero' }),
      }));

    return {
      reason: REASON_MESSAGES[entry.reason],
      amounts,
      at: entry.at === undefined ? undefined : Temporal.Instant.from(entry.at),
    };
  }
}
