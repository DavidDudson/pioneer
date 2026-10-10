import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import { ContentId } from './content-id';
import { BulkCount, ItemCount, physicalFields, Price, Usage } from './physical-item';

/** What a container holds, and how much of it doesn't count when worn ("the first 2 Bulk", a backpack). */
const Container = z.strictObject({ capacity: BulkCount, ignored: BulkCount.optional() });

/**
 * Equipment's `data` on the `ContentEntry` envelope: adventuring gear, worn and held items, and containers, which
 * Foundry pf2e keeps as `backpack` items. What it does is its `rules`.
 */
export const EquipmentData = z.strictObject({
  ...physicalFields,
  usage: Usage.optional(),
  container: Container.optional(),
  /** The attribute an apex item raises. */
  apex: AttributeSchema.optional(),
});
export type EquipmentData = z.infer<typeof EquipmentData>;

/** What treasure is, as Foundry pf2e sorts it. */
export const TreasureCategory = { ArtObject: 'art-object', Coin: 'coin', Gem: 'gem', Material: 'material' } as const;
export type TreasureCategory = ValueOf<typeof TreasureCategory>;

/** Treasure's `data` on the `ContentEntry` envelope: coins, gems, art objects and materials, worth their price. */
export const TreasureData = z.strictObject({
  ...physicalFields,
  category: z.enum(TreasureCategory).optional(),
});
export type TreasureData = z.infer<typeof TreasureData>;

const KIT_ITEMS_MAX = 32;

/** An item in a kit, by `ContentId`, and how many. */
const kitItem = { item: ContentId, quantity: ItemCount };

/** An item in a kit, with what it holds when it is a container (a backpack's rope and torches). */
const KitItem = z.strictObject({
  ...kitItem,
  contents: z.array(z.strictObject(kitItem)).max(KIT_ITEMS_MAX).readonly().optional(),
});

/**
 * A kit's `data` on the `ContentEntry` envelope: what it holds and what it costs as one purchase. It has no level or
 * Bulk of its own; a class kit carries its class's trait.
 */
export const KitData = z.strictObject({
  price: Price.optional(),
  items: z.array(KitItem).min(1).max(KIT_ITEMS_MAX).readonly(),
});
export type KitData = z.infer<typeof KitData>;
