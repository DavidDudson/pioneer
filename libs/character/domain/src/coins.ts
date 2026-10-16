import { Coin } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** How many of one coin the character holds; a dragon's hoard runs past a smallint. */
export const CoinAmount = Pg.integer().nonnegative().brand<'CoinAmount'>();
export type CoinAmount = z.infer<typeof CoinAmount>;

const NO_COINS = CoinAmount.parse(0);

/** The character's purse: every coin, none when absent. */
export const CoinsSchema = z.strictObject({
  [Coin.Platinum]: CoinAmount.default(NO_COINS),
  [Coin.Gold]: CoinAmount.default(NO_COINS),
  [Coin.Silver]: CoinAmount.default(NO_COINS),
  [Coin.Copper]: CoinAmount.default(NO_COINS),
});
export type Coins = z.infer<typeof CoinsSchema>;
