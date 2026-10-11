import { ContentId, ContentText, ItemCount, Level, Price, Rarity } from '@pioneer/rules/sdk';

import type { ShopOffer } from '../shop/shop-offer';

const ids = [
  '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0001',
  '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0002',
  '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0003',
  '7b0c3a52-3f43-4f0e-9a3c-1f1b8f0c0004',
] as const;

function offer(index: number, name: string, level: number, rarity: Rarity, price: object | undefined): ShopOffer {
  return {
    id: ContentId.parse(ids[index]),
    name: ContentText.parse(name),
    level: Level.parse(level),
    rarity,
    price: price === undefined ? undefined : Price.parse(price),
  };
}

export const LONGSWORD = offer(0, 'Longsword', 0, Rarity.Common, { coins: { gp: 1 } });
export const ARROWS = offer(1, 'Arrows', 0, Rarity.Common, { coins: { sp: 1 }, per: ItemCount.parse(10) });
export const STAFF_OF_FIRE = offer(2, 'Staff of Fire', 3, Rarity.Uncommon, { coins: { gp: 60, sp: 5 } });
export const LUCKY_STONE = offer(3, 'Lucky Stone', 1, Rarity.Rare, undefined);

/** A few offers: a common item, one sold in a batch, an uncommon one with a two-coin price and a rare one with none. */
export const SHOP_OFFERS: readonly ShopOffer[] = [LONGSWORD, ARROWS, STAFF_OF_FIRE, LUCKY_STONE];

/** More offers than the list shows at once. */
export const MANY_OFFERS: readonly ShopOffer[] = Array.from({ length: 60 }, (_, index) => ({
  ...LONGSWORD,
  id: ContentId.parse(`7b0c3a52-3f43-4f0e-9a3c-${String(index).padStart(12, '0')}`),
  name: ContentText.parse(`Longsword ${index + 1}`),
}));
