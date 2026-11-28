import { Coin } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { withCoins } from './coin-ledger-edits';
import { withSimplifiedCoins } from './coin-simplify';
import { CoinAmount } from './coins';
import type { Coins } from './coins';
import { coinsValue, payCost } from './purse';

const COINS: ReadonlyArray<Coin> = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper];

/** Whether every coin of the purse, with `coins` added, is still a count a purse can hold. */
export function canHoldCoins(document: CharacterDocument, coins: Coins): boolean {
  const purse = document.inventory.coins;

  return COINS.every((coin) => CoinAmount.safeParse(purse[coin] + coins[coin]).success);
}

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

/** `document` with `coins` taken from its purse; throws when the purse is worth less. */
function withTakenCoins(document: CharacterDocument, coins: Coins): CharacterDocument {
  const left = payCost(document.inventory.coins, coinsValue(coins));

  if (left === undefined) {
    throw new TypeError(
      `Cannot take ${JSON.stringify(coins)} from a purse of ${JSON.stringify(document.inventory.coins)}`,
    );
  }

  return withCoins(document, left);
}

/** The edits that add coins to the purse, take them from it or trade small coins up. */
export type CoinPatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.GiftCoins
      | typeof CharacterPatchField.TakeCoins
      | typeof CharacterPatchField.SimplifyCoins;
  }
>;

/** Whether `patch` is one of the coin edits. */
export function isCoinPatch(patch: CharacterPatch): patch is CoinPatch {
  return (
    patch.field === CharacterPatchField.GiftCoins ||
    patch.field === CharacterPatchField.TakeCoins ||
    patch.field === CharacterPatchField.SimplifyCoins
  );
}

/** `document` with the coins of a gift added, the coins of a take removed, or its purse simplified. */
export function withCoinEdit(document: CharacterDocument, patch: CoinPatch): CharacterDocument {
  switch (patch.field) {
    case CharacterPatchField.GiftCoins: {
      return withGiftedCoins(document, patch.coins);
    }

    case CharacterPatchField.TakeCoins: {
      return withTakenCoins(document, patch.coins);
    }

    case CharacterPatchField.SimplifyCoins: {
      return withSimplifiedCoins(document);
    }

    default: {
      return patch satisfies never;
    }
  }
}
