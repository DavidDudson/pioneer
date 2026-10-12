import { Coin, COPPER_PER_COIN, CopperValue, ItemCount, priceInCopper } from '@pioneer/rules/sdk';
import type { Price } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { CoinAmount, CoinsSchema } from './inventory';
import type { Coins, ItemQuantity } from './inventory';

/** The coins, largest first: change is given in these, as few coins as it takes. */
const LARGEST_FIRST: readonly Coin[] = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper];

const FREE = CopperValue.parse(0);
const ONE_COIN = CoinAmount.parse(1);
const NO_COINS: Coins = CoinsSchema.parse({});
/** How many items a price is for when it names no batch. */
const SINGLE = ItemCount.parse(1);

/** What the purse is worth in copper. */
export function coinsValue(coins: Coins): CopperValue {
  return CopperValue.parse(LARGEST_FIRST.reduce((total, coin) => total + coins[coin] * COPPER_PER_COIN[coin], 0));
}

/** `value` in as few coins as it takes, the largest first: 150 cp is 1 gp 5 sp. */
export function coinsOf(value: CopperValue): Coins {
  let left = value;
  const coins: Coins = { ...NO_COINS };
  for (const coin of LARGEST_FIRST) {
    const worth = COPPER_PER_COIN[coin];
    coins[coin] = CoinAmount.parse(Math.floor(left / worth));
    left = CopperValue.parse(left - coins[coin] * worth);
  }
  return coins;
}

/** How many of a coin a cost is written in. Unlike a purse's `CoinAmount`, a big order's gold may pass an int4. */
const CoinTally = z.int().nonnegative().brand<'CoinTally'>();
type CoinTally = z.infer<typeof CoinTally>;

/** A cost as written, by coin. */
export type CostCoins = Readonly<Record<Coin, CoinTally>>;

/** `value` as prices are written: in gold, silver and copper, platinum counted as gold (1,600 gp, not 160 pp). */
export function costCoins(value: CopperValue): CostCoins {
  const goldWorth = COPPER_PER_COIN[Coin.Gold];
  const rest = coinsOf(CopperValue.parse(value % goldWorth));
  return {
    [Coin.Platinum]: CoinTally.parse(0),
    [Coin.Gold]: CoinTally.parse(Math.floor(value / goldWorth)),
    [Coin.Silver]: CoinTally.parse(rest[Coin.Silver]),
    [Coin.Copper]: CoinTally.parse(rest[Coin.Copper]),
  };
}

/**
 * What `quantity` items cost in copper. A batch's price ("1 sp for 10") is shared out over the batch and rounded up to
 * the copper, so 15 arrows cost 15 cp and one dart of a 1 cp batch of 10 costs 1 cp. An item with no price costs nothing.
 */
export function purchaseCost(price: Price | undefined, quantity: ItemQuantity): CopperValue {
  if (price === undefined) {
    return FREE;
  }
  const per = price.per ?? SINGLE;
  return CopperValue.parse(Math.ceil((priceInCopper(price) * quantity) / per));
}

/** The coins handed over to pay a cost, and the change given back. */
export interface Payment {
  readonly handed: Coins;
  readonly change: Coins;
}

/** The largest coins that fit within `cost`, as many of each as the purse holds: an exact payment when it allows. */
function largestWithin(coins: Coins, cost: CopperValue): Coins {
  let owed = cost;
  const handed: Coins = { ...NO_COINS };
  for (const coin of LARGEST_FIRST) {
    const worth = COPPER_PER_COIN[coin];
    handed[coin] = CoinAmount.parse(Math.min(coins[coin], Math.floor(owed / worth)));
    owed = CopperValue.parse(owed - handed[coin] * worth);
  }
  return handed;
}

/** `handed` without the coins it doesn't need to cover `cost`, the smallest taken back first. */
function trimmed(handed: Coins, cost: CopperValue): Coins {
  const kept: Coins = { ...handed };
  for (const coin of LARGEST_FIRST.toReversed()) {
    const worth = COPPER_PER_COIN[coin];
    const spare = Math.floor((coinsValue(kept) - cost) / worth);
    kept[coin] = CoinAmount.parse(kept[coin] - Math.min(kept[coin], spare));
  }
  return kept;
}

/**
 * How `coins` pay `cost`, or undefined when they are worth less. Pays exactly where the coins allow, largest coins
 * first; otherwise adds the smallest coin left, which covers what is still owed, takes back what that leaves
 * unneeded, and gives the change in the largest coins. Deterministic.
 */
export function payment(coins: Coins, cost: CopperValue): Payment | undefined {
  if (coinsValue(coins) < cost) {
    return undefined;
  }
  const exact = largestWithin(coins, cost);
  if (coinsValue(exact) === cost) {
    return { handed: exact, change: NO_COINS };
  }
  // Every coin left is worth more than what is still owed, or `largestWithin` would have handed it over.
  const broken = LARGEST_FIRST.toReversed().find((coin) => coins[coin] > exact[coin]);
  if (broken === undefined) {
    throw new TypeError('A purse worth the cost holds a coin that covers what is left');
  }
  const handed = trimmed({ ...exact, [broken]: CoinAmount.parse(exact[broken] + ONE_COIN) }, cost);
  return { handed, change: coinsOf(CopperValue.parse(coinsValue(handed) - cost)) };
}

/** `coins` after paying `cost` (`payment`), or undefined when they are worth less: never left in debt. */
export function payCost(coins: Coins, cost: CopperValue): Coins | undefined {
  const paid = payment(coins, cost);
  if (paid === undefined) {
    return undefined;
  }
  const { handed, change } = paid;
  return CoinsSchema.parse(
    Object.fromEntries(LARGEST_FIRST.map((coin) => [coin, coins[coin] - handed[coin] + change[coin]])),
  );
}
