import * as z from 'zod';

import { LedgerNote, LedgerReason } from './coin-ledger';
import { CoinsSchema } from './coins';
import { coinsValue } from './purse';

/** Why coins are added or taken by hand: a gift, or loot. */
export const CoinGrantReason = z.enum([LedgerReason.Gift, LedgerReason.Loot]);

export type CoinGrantReason = z.infer<typeof CoinGrantReason>;

/** Coins in any mix of denominations, at least one of them held: a gift or a take of nothing is no edit. */
export const SomeCoinsSchema = CoinsSchema.refine((coins) => coinsValue(coins) > 0);

/** What a gift or a take of coins carries besides its field: the coins, why, and an optional note. */
export const CoinGrantFields = {
  coins: SomeCoinsSchema,
  reason: CoinGrantReason,
  note: LedgerNote.optional(),
};
