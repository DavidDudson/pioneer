import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { coinsValue, LedgerReason } from '@pioneer/character/domain';
import type { LedgerEntry } from '@pioneer/character/domain';
import {
  Button,
  ButtonVariant,
  DateDisplay,
  DateFormat,
  Heading,
  List,
  ListItem,
  LocaleFormat,
  Stack,
  Text,
} from '@pioneer/frontier';
import { Coin, COPPER_PER_COIN } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../../data/character-store';

/** Why the coins changed, as the message that says so. */
const REASON_MESSAGES: Readonly<Record<LedgerReason, string>> = {
  [LedgerReason.Opening]: 'character.sheet.inventory.ledger.reason.opening',
  [LedgerReason.Purchase]: 'character.sheet.inventory.ledger.reason.purchase',
  [LedgerReason.Adjustment]: 'character.sheet.inventory.ledger.reason.adjustment',
  [LedgerReason.Income]: 'character.sheet.inventory.ledger.reason.income',
  [LedgerReason.Transfer]: 'character.sheet.inventory.ledger.reason.transfer',
};

/** Each coin's short name, as an amount is written. */
export const COIN_MESSAGES: Readonly<Record<Coin, string>> = {
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

/** The newest entries shown before the rest are asked for. */
const RECENT_ROWS = 20;

/** The gold total's decimals: a silver is a tenth of a gold, a copper a hundredth. */
const TOTAL_DECIMALS = 2;

/** One ledger entry as the section shows it. */
interface EntryRow {
  /** The entry's place in the ledger, which stays put as newer entries come. */
  readonly key: number;
  readonly reason: string;
  readonly amounts: readonly AmountRow[];
  readonly at: Temporal.Instant | undefined;
}

/** The Wealth section: what the coins are worth in gold and every change to them, newest first. */
@Component({
  selector: 'pio-coin-ledger',
  imports: [Button, DateDisplay, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './coin-ledger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinLedger {
  readonly #store = inject(CharacterStore);
  readonly #format = inject(LocaleFormat);

  protected readonly dateFormat = DateFormat.DateTime;
  protected readonly ghost = ButtonVariant.Ghost;
  protected readonly everything = signal(false);

  readonly #ledger = computed(() => this.#store.selected()?.document.inventory.ledger);

  /** What the purse is worth, in gold. */
  protected readonly total = computed(() => {
    const coins = this.#store.selected()?.document.inventory.coins;
    const copper = coins === undefined ? 0 : coinsValue(coins);

    return this.#format.number(copper / COPPER_PER_COIN[Coin.Gold], { maximumFractionDigits: TOTAL_DECIMALS });
  });

  /** Whether entries are left out of the list. */
  protected readonly truncated = computed(() => (this.#ledger()?.length ?? 0) > RECENT_ROWS && !this.everything());

  protected readonly rows = computed((): readonly EntryRow[] => {
    const ledger = this.#ledger() ?? [];
    const shown = this.everything() ? ledger.length : Math.min(ledger.length, RECENT_ROWS);

    return ledger
      .slice(ledger.length - shown)
      .map((entry, index) => this.#row(entry, ledger.length - shown + index))
      .toReversed();
  });

  protected showEverything(): void {
    this.everything.set(true);
  }

  #row(entry: LedgerEntry, key: number): EntryRow {
    const amounts = Object.values(Coin)
      .filter((coin) => entry.change[coin] !== 0)
      .map((coin) => ({
        coin: COIN_MESSAGES[coin],
        amount: this.#format.number(entry.change[coin], { signDisplay: 'exceptZero' }),
      }));

    return {
      key,
      reason: REASON_MESSAGES[entry.reason],
      amounts,
      at: entry.at === undefined ? undefined : Temporal.Instant.from(entry.at),
    };
  }
}
