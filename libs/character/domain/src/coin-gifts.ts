import { Coin } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { withCoins } from './coin-ledger-edits';
import { CoinAmount } from './coins';
import type { Coins } from './coins';
import { coinsValue, payCost } from './purse';

/** `document` with `coins` added to its purse, coin for coin. */
function withGiftedCoins(document: CharacterDocument, coins: Coins): CharacterDocument {
  const purse = document.inventory.coins;

  return withCoins(document, {
    [Coin.Platinum]: CoinAmount.parse(purse[Coin.Platinum] + coins[Coin.Platinum]),
    [Coin.Gold]: CoinAmount.parse(purse[Coin.Gold] + coins[Coin.Gold]),
    [Coin.Silver]: CoinAmount.parse(purse[Coin.Silver] + coins[Coin.Silver]),
    [Coin.Copper]: CoinAmount.parse(purse[Coin.Copper] + coins[Coin.Copper]),
  });
}

/** Whether the purse is worth at least `coins`, so they can be taken (change given where a larger coin must break). */
export function canTakeCoins(document: CharacterDocument, coins: Coins): boolean {
  return payCost(document.inventory.coins, coinsValue(coins)) !== undefined;
}

/** `document` with `coins` taken from its purse. A purse worth less is a caller's bug: the service refuses it first. */
function withTakenCoins(document: CharacterDocument, coins: Coins): CharacterDocument {
  const left = payCost(document.inventory.coins, coinsValue(coins));

  if (left === undefined) {
    throw new TypeError('The purse is worth less than the coins to take');
  }

  return withCoins(document, left);
}

/** The edits that add coins to the purse or take them from it. */
export type CoinGrantPatch = Extract<
  CharacterPatch,
  { readonly field: typeof CharacterPatchField.GiftCoins | typeof CharacterPatchField.TakeCoins }
>;

/** `document` with the coins of a gift added or the coins of a take removed. */
export function withCoinGrant(document: CharacterDocument, patch: CoinGrantPatch): CharacterDocument {
  return patch.field === CharacterPatchField.GiftCoins
    ? withGiftedCoins(document, patch.coins)
    : withTakenCoins(document, patch.coins);
}
