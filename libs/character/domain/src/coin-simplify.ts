import { Coin, COPPER_PER_COIN } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { withCoins } from './coin-ledger-edits';
import { CoinAmount } from './coins';
import type { Coins } from './coins';

/** The coins from the smallest up: each trades up into the next at the ratio of their worth (10 cp = 1 sp). */
const SMALLEST_FIRST: ReadonlyArray<Coin> = [Coin.Copper, Coin.Silver, Coin.Gold, Coin.Platinum];

/**
 * `coins` with every ten of a coin traded up for one of the next (10 cp to 1 sp, 10 sp to 1 gp, 10 gp to 1 pp), the
 * smaller coins first so a carry can carry again. What does not make a whole larger coin stays, and the value never
 * changes.
 */
export function simplifiedCoins(coins: Coins): Coins {
  const simplified: Coins = { ...coins };

  for (const [index, coin] of SMALLEST_FIRST.entries()) {
    const larger = SMALLEST_FIRST[index + 1];

    if (larger === undefined) {
      break;
    }

    const trade = Math.floor(COPPER_PER_COIN[larger] / COPPER_PER_COIN[coin]);
    const carried = Math.floor(simplified[coin] / trade);

    simplified[coin] = CoinAmount.parse(simplified[coin] - carried * trade);
    simplified[larger] = CoinAmount.parse(simplified[larger] + carried);
  }

  return simplified;
}

/** Whether any coin of `coins` can be traded up. */
export function canSimplify(coins: Coins): boolean {
  const simplified = simplifiedCoins(coins);

  return SMALLEST_FIRST.some((coin) => simplified[coin] !== coins[coin]);
}

/** `document` with its purse simplified. */
export function withSimplifiedCoins(document: CharacterDocument): CharacterDocument {
  return withCoins(document, simplifiedCoins(document.inventory.coins));
}
