import { BadgeTone } from '@pioneer/frontier';
import { Coin, Rarity } from '@pioneer/rules/sdk';
import type { ContentId, ContentLevel, ContentText, Price } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** An item the shop offers: what the list shows of it. */
export interface ShopOffer {
  readonly id: ContentId;
  readonly name: ContentText;
  /** Undefined for an item content gives no level. */
  readonly level: ContentLevel | undefined;
  readonly rarity: Rarity;
  /** Undefined for an item with no price ("—"). */
  readonly price: Price | undefined;
}

/** Message keys the shop renders with, spelled out so the key check sees them. */
export const ShopMessage = {
  Coin: 'rules.shop.coin',
  PricePer: 'rules.shop.pricePer',
  NoPrice: 'rules.shop.noPrice',
  Line: 'rules.shop.line',
  LineNoLevel: 'rules.shop.lineNoLevel',
  Pick: 'rules.shop.pick',
  PickNamed: 'rules.shop.pickNamed',
  More: 'rules.shop.more',
  NoneTitle: 'rules.shop.noneTitle',
  NoneDescription: 'rules.shop.noneDescription',
  Cost: 'rules.shop.cost',
  Coins: 'rules.shop.coins',
  Free: 'rules.shop.free',
  NoCoins: 'rules.shop.noCoins',
  CannotAfford: 'rules.shop.cannotAfford',
  CannotAffordKit: 'rules.shop.cannotAffordKit',
  KitLine: 'rules.shop.kitLine',
} as const;

/** What a bill is for, which says why the coins fall short: an item's quantity can drop, a kit's can't. */
export const ShopBillFor = { Item: 'item', Kit: 'kit' } as const;
export type ShopBillFor = ValueOf<typeof ShopBillFor>;

/** An item a kit holds, by name, with how many, and what it holds when it is a container. */
export interface KitLine {
  /** The item's content, which its name previews on hover. */
  readonly item: ContentId;
  readonly name: string;
  readonly quantity: number;
  readonly contents: readonly KitLine[];
}

/** A rarity's badge: its name and tone. Common items carry none. */
export interface RarityBadge {
  readonly key: string;
  readonly tone: BadgeTone;
}

export const RARITY_BADGES: Readonly<Partial<Record<Rarity, RarityBadge>>> = {
  [Rarity.Uncommon]: { key: 'rules.facet.rarity.uncommon', tone: BadgeTone.Warning },
  [Rarity.Rare]: { key: 'rules.facet.rarity.rare', tone: BadgeTone.Info },
  [Rarity.Unique]: { key: 'rules.facet.rarity.unique', tone: BadgeTone.Accent },
};

/** The coins of a price, largest first, each with its count: 3 gp 5 sp. */
export interface CoinCount {
  readonly coin: Coin;
  readonly count: number;
}

const COINS: readonly Coin[] = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper];

export function priceCoins({ coins }: Price): readonly CoinCount[] {
  return COINS.flatMap((coin) => {
    const count = coins[coin];
    return count === undefined ? [] : [{ coin, count }];
  });
}

/** A purse or a cost as coin counts, largest first, leaving out the coins it has none of. */
export function coinCounts(coins: Readonly<Record<Coin, number>>): readonly CoinCount[] {
  return COINS.flatMap((coin) => (coins[coin] > 0 ? [{ coin, count: coins[coin] }] : []));
}

/** Coin counts as one line, each coin as `coinText` writes it: "3 gp 5 sp". */
export function coinsText(counts: readonly CoinCount[], coinText: (coin: Coin, count: number) => string): string {
  return counts.map(({ coin, count }) => coinText(coin, count)).join(' ');
}
