import { Coin, COPPER_PER_COIN, CopperValue, ItemCount, priceInCopper } from '@pioneer/rules/sdk';
import type { Price } from '@pioneer/rules/sdk';

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

/** `value` as prices are written: in gold, silver and copper, platinum counted as gold (1,600 gp, not 160 pp). */
export function costCoins(value: CopperValue): Coins {
  const coins = coinsOf(value);
  const gold = coins[Coin.Gold] + (coins[Coin.Platinum] * COPPER_PER_COIN[Coin.Platinum]) / COPPER_PER_COIN[Coin.Gold];
  return { ...coins, [Coin.Platinum]: NO_COINS[Coin.Platinum], [Coin.Gold]: CoinAmount.parse(gold) };
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

/**
 * `coins` after paying `cost`, or undefined when they are worth less: a character is never left in debt. Pays exactly
 * where the coins allow, largest coins first; otherwise breaks one coin, the smallest left that covers what is still
 * owed, and takes the change in the largest coins below it. Deterministic, and the purse loses exactly `cost`.
 */
export function payCost(coins: Coins, cost: CopperValue): Coins | undefined {
  if (coinsValue(coins) < cost) {
    return undefined;
  }
  const left: Coins = { ...coins };
  let owed = cost;
  for (const coin of LARGEST_FIRST) {
    const worth = COPPER_PER_COIN[coin];
    const used = Math.min(left[coin], Math.floor(owed / worth));
    left[coin] = CoinAmount.parse(left[coin] - used);
    owed = CopperValue.parse(owed - used * worth);
  }
  if (owed === FREE) {
    return CoinsSchema.parse(left);
  }
  // Every coin still held is worth more than what is owed, or the loop would have spent it; one of them covers it.
  const broken = LARGEST_FIRST.toReversed().find((coin) => left[coin] > 0);
  if (broken === undefined) {
    throw new TypeError('A purse worth the cost holds a coin that covers what is left');
  }
  left[broken] = CoinAmount.parse(left[broken] - ONE_COIN);
  const change = coinsOf(CopperValue.parse(COPPER_PER_COIN[broken] - owed));
  return CoinsSchema.parse(Object.fromEntries(LARGEST_FIRST.map((coin) => [coin, left[coin] + change[coin]])));
}
