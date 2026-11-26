import { Coin } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type { Temporal, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CoinAmount, CoinsSchema } from './coins';
import type { Coins } from './coins';

/** Why the coins changed. */
export const LedgerReason = {
  /** What the purse held when the ledger began: a new character's coins, or an older character's when it was upgraded. */
  Opening: 'opening',
  /** The shop took payment and gave change. */
  Purchase: 'purchase',
  /** The player set the coins by hand. */
  Adjustment: 'adjustment',
  /** Coins moved to or from another character or the party stash. */
  Transfer: 'transfer',
} as const;

export type LedgerReason = ValueOf<typeof LedgerReason>;

/** How many of one coin an entry adds (positive) or takes (negative). */
const CoinChangeAmount = Pg.integer().brand<'CoinChangeAmount'>();

const NO_CHANGE = CoinChangeAmount.parse(0);

/** A change to the purse, coin by coin; none when absent. */
export const CoinChangeSchema = z.strictObject({
  [Coin.Platinum]: CoinChangeAmount.default(NO_CHANGE),
  [Coin.Gold]: CoinChangeAmount.default(NO_CHANGE),
  [Coin.Silver]: CoinChangeAmount.default(NO_CHANGE),
  [Coin.Copper]: CoinChangeAmount.default(NO_CHANGE),
});

export type CoinChange = z.infer<typeof CoinChangeSchema>;

/** When an entry was made, as the ISO timestamp the server stamps. */
export const LedgerTime = z.iso.datetime({ precision: 3 }).brand<'LedgerTime'>();

export type LedgerTime = z.infer<typeof LedgerTime>;

/** One change to the character's coins with its reason. An opening entry written by an upgrade has no time. */
export const LedgerEntrySchema = z.strictObject({
  reason: z.enum(LedgerReason),
  change: CoinChangeSchema,
  at: LedgerTime.optional(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

const COINS = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper] as const;

/** What it takes to get from `before` to `after`, coin by coin. */
export function coinChange(before: Coins, after: Coins): CoinChange {
  return CoinChangeSchema.parse(
    Object.fromEntries(COINS.map((coin) => [coin, CoinChangeAmount.parse(after[coin] - before[coin])])),
  );
}

/** Whether `change` moves no coin. */
function isNoChange(change: CoinChange): boolean {
  return COINS.every((coin) => change[coin] === NO_CHANGE);
}

/** The purse the entries add up to: every change summed, coin by coin. */
export function ledgerCoins(ledger: readonly LedgerEntry[]): Coins {
  return CoinsSchema.parse(
    Object.fromEntries(
      COINS.map((coin) => [coin, CoinAmount.parse(ledger.reduce((total, entry) => total + entry.change[coin], 0))]),
    ),
  );
}

/** `ledger` with an entry for the change from `before` to `after`, or as it was when no coin moved. */
export function withCoinEntry(
  ledger: readonly LedgerEntry[],
  edit: {
    readonly before: Coins;
    readonly after: Coins;
    readonly reason: LedgerReason;
    readonly now: Temporal.Instant;
  },
): readonly LedgerEntry[] {
  const change = coinChange(edit.before, edit.after);

  if (isNoChange(change)) {
    return ledger;
  }

  const at = LedgerTime.parse(edit.now.toString({ smallestUnit: 'millisecond' }));

  return [...ledger, { reason: edit.reason, change, at }];
}
