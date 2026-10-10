import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { RulesMessage } from './messages';
import { SizeSchema } from './size';
import { HitPoints } from './units';

/** The coins a price is counted in, largest first, as Foundry pf2e lists them. */
export const Coin = { Platinum: 'pp', Gold: 'gp', Silver: 'sp', Copper: 'cp' } as const;
export type Coin = ValueOf<typeof Coin>;

/** How many of one coin; prices run past a smallint (90,000 gp). */
const CoinCount = Pg.integer().positive().brand<'CoinCount'>();

/** How many items a price or bulk is for: arrows are "1 sp for 10". */
export const ItemCount = Pg.smallint().positive().brand<'ItemCount'>();
export type ItemCount = z.infer<typeof ItemCount>;

/** "1 gp", "3 gp 5 sp": each coin given at most once, at least one of them. */
const Coins = z
  .strictObject({
    [Coin.Platinum]: CoinCount.optional(),
    [Coin.Gold]: CoinCount.optional(),
    [Coin.Silver]: CoinCount.optional(),
    [Coin.Copper]: CoinCount.optional(),
  })
  .refine((coins) => Object.values(coins).some((count) => count !== undefined), {
    ...issueParams(message(RulesMessage.ItemPriceEmpty)),
  });

/** What an item costs, for `per` items when it is sold in a batch. An item with no price ("—") has none. */
export const Price = z.strictObject({ coins: Coins, per: ItemCount.optional() });
export type Price = z.infer<typeof Price>;

/** Bulk below 1: negligible ("—") or light ("L"), which is a tenth of 1 Bulk. */
export const BulkWeight = { Negligible: 'negligible', Light: 'light' } as const;
export type BulkWeight = ValueOf<typeof BulkWeight>;

/** Whole Bulk: 1, 2, 50. */
export const BulkCount = Pg.smallint().positive().brand<'BulkCount'>();
export type BulkCount = z.infer<typeof BulkCount>;

/** An item's Bulk at medium size. */
export const Bulk = z.union([z.enum(BulkWeight), BulkCount]);
export type Bulk = z.infer<typeof Bulk>;

export const Hardness = Pg.smallint().nonnegative().brand<'Hardness'>();
export type Hardness = z.infer<typeof Hardness>;

/** A precious material (`cold-iron`, `dawnsilver`). Foundry pf2e keeps the set in config, so it is a brand. */
const PreciousMaterial = Slug.brand<'PreciousMaterial'>();

export const MaterialGrade = { Low: 'low', Standard: 'standard', High: 'high' } as const;
export type MaterialGrade = ValueOf<typeof MaterialGrade>;

/** "Standard-grade cold iron". */
const Material = z.strictObject({ type: PreciousMaterial, grade: z.enum(MaterialGrade).optional() });

/** The fields every physical item kind has: what it costs and weighs, and how sturdy it is. */
export const physicalFields = {
  price: Price.optional(),
  bulk: Bulk,
  /** How many items `bulk` is for, when not one: 10 arrows are light, 1,000 coins are 1 Bulk. */
  bulkPer: ItemCount.optional(),
  /** Medium when absent; a large creature's item costs and weighs more. */
  size: SizeSchema.optional(),
  hardness: Hardness.optional(),
  hitPoints: HitPoints.optional(),
  material: Material.optional(),
};

/** How an item is used, Foundry pf2e's `usage` split into its parts. */
export const UsageType = {
  Held: 'held',
  Worn: 'worn',
  Affixed: 'affixed',
  Attached: 'attached',
  Applied: 'applied',
  Installed: 'installed',
  Tattooed: 'tattooed',
  Implanted: 'implanted',
  Carried: 'carried',
  Other: 'other',
} as const;
export type UsageType = ValueOf<typeof UsageType>;

/** The hands an item is held in: "held in 1 hand", "1+ hands" (two-hand weapons, bucklers), "2 hands". */
export const UsageHands = { One: 'one', OnePlus: 'one-plus', Two: 'two' } as const;
export type UsageHands = ValueOf<typeof UsageHands>;

/** The slot a worn item takes (`cloak`, `headwear`), Foundry pf2e's `worn<slot>`; none for "worn" alone. */
const WornSlot = Slug.brand<'WornSlot'>();

/** What an item is affixed, attached, applied or installed to (`armor-or-a-weapon`, `crossbow-or-firearm-scope`). */
const UsageTarget = Slug.brand<'UsageTarget'>();

/** "Held in 1 hand", "worn cloak", "affixed to armor or a weapon", "tattooed", "implanted". */
export const Usage = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(UsageType.Held), hands: z.enum(UsageHands) }),
  z.strictObject({ type: z.literal(UsageType.Worn), slot: WornSlot.optional() }),
  z.strictObject({
    type: z.enum([UsageType.Affixed, UsageType.Attached, UsageType.Applied, UsageType.Installed]),
    to: UsageTarget,
  }),
  z.strictObject({
    type: z.enum([UsageType.Tattooed, UsageType.Implanted, UsageType.Carried, UsageType.Other]),
  }),
]);
export type Usage = z.infer<typeof Usage>;
