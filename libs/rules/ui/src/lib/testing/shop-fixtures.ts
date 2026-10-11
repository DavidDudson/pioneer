import { ContentId, ContentLevel, ContentText, ItemCount, Price, Rarity } from '@pioneer/rules/sdk';

import type { ShopOffer } from '../shop/shop-offer';

interface OfferFields {
  readonly id: string;
  readonly name: string;
  readonly level: ContentLevel | undefined;
  readonly rarity: Rarity;
  readonly price: Price | undefined;
}

function offer({ id, name, level, rarity, price }: OfferFields): ShopOffer {
  return { id: ContentId.parse(id), name: ContentText.parse(name), level, rarity, price };
}

const LEVEL_0 = ContentLevel.parse(0);
const LEVEL_1 = ContentLevel.parse(1);
const LEVEL_3 = ContentLevel.parse(3);
const ARROWS_PER_PRICE = ItemCount.parse(10);

export const LONGSWORD = offer({
  id: '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0001',
  name: 'Longsword',
  level: LEVEL_0,
  rarity: Rarity.Common,
  price: Price.parse({ coins: { gp: 1 } }),
});
const ARROWS = offer({
  id: '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0002',
  name: 'Arrows',
  level: LEVEL_0,
  rarity: Rarity.Common,
  price: Price.parse({ coins: { sp: 1 }, per: ARROWS_PER_PRICE }),
});
export const STAFF_OF_FIRE = offer({
  id: '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0003',
  name: 'Staff of Fire',
  level: LEVEL_3,
  rarity: Rarity.Uncommon,
  price: Price.parse({ coins: { gp: 60, sp: 5 } }),
});
const LUCKY_STONE = offer({
  id: '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0004',
  name: 'Lucky Stone',
  level: LEVEL_1,
  rarity: Rarity.Rare,
  price: undefined,
});

const TRADE_GOODS = offer({
  id: '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0005',
  name: 'Trade Goods',
  level: undefined,
  rarity: Rarity.Common,
  price: Price.parse({ coins: { cp: 5 } }),
});

/**
 * A few offers: a common item, one sold in a batch, an uncommon one with a two-coin price, a rare one with none and
 * one with no level.
 */
export const SHOP_OFFERS: readonly ShopOffer[] = [LONGSWORD, ARROWS, STAFF_OF_FIRE, LUCKY_STONE, TRADE_GOODS];

/** More offers than the list shows at once. */
const MANY = 60;
const ID_DIGITS = 12;

export const MANY_OFFERS: readonly ShopOffer[] = Array.from({ length: MANY }, (_unused, index) => ({
  ...LONGSWORD,
  id: ContentId.parse(`7b0c3a52-3f43-4f0e-9a3c-${String(index).padStart(ID_DIGITS, '0')}`),
  name: ContentText.parse(`Longsword ${index + 1}`),
}));
