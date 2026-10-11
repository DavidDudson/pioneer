import { BadgeTone } from '@pioneer/frontier';
import { Coin, Rarity } from '@pioneer/rules/sdk';
import type { ContentId, ContentText, Level, Price } from '@pioneer/rules/sdk';

/** An item the shop offers: what the list shows of it. */
export interface ShopOffer {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly level: Level;
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
  Pick: 'rules.shop.pick',
  PickNamed: 'rules.shop.pickNamed',
  More: 'rules.shop.more',
  NoneTitle: 'rules.shop.noneTitle',
  NoneDescription: 'rules.shop.noneDescription',
} as const;

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
