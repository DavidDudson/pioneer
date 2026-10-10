import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentEntry } from './content-entry';
import { ContentKind } from './content-kind';
import { BulkWeight, Coin, UsageType } from './physical-item';
import type { Bulk, Price } from './physical-item';
import { Trait } from './trait';

/** The equipment kinds, which share one facet set so a mixed list filters alike. */
export const EquipmentKind = {
  Weapon: ContentKind.Weapon,
  Armor: ContentKind.Armor,
  Shield: ContentKind.Shield,
  Equipment: ContentKind.Equipment,
  Consumable: ContentKind.Consumable,
  Rune: ContentKind.Rune,
  Treasure: ContentKind.Treasure,
  Kit: ContentKind.Kit,
} as const;
export type EquipmentKind = ValueOf<typeof EquipmentKind>;

export type EquipmentEntry = Extract<ContentEntry, { readonly kind: EquipmentKind }>;

const EQUIPMENT_KINDS: ReadonlySet<ContentKind> = new Set(Object.values(EquipmentKind));

export function isEquipment(entry: ContentEntry): entry is EquipmentEntry {
  return EQUIPMENT_KINDS.has(entry.kind);
}

/** How an item is used as a facet value: Foundry's usage, and `etched` for a rune. */
export const UsageValue = { ...UsageType, Etched: 'etched' } as const;
export type UsageValue = ValueOf<typeof UsageValue>;

/** A price in copper pieces, the one currency prices compare in. */
export const CopperValue = z.int().nonnegative().brand<'CopperValue'>();
export type CopperValue = z.infer<typeof CopperValue>;

/** Bulk in tenths, so light (a tenth) and negligible order below 1 Bulk: 1 Bulk is 10. */
export const BulkTenths = z.int().nonnegative().brand<'BulkTenths'>();
export type BulkTenths = z.infer<typeof BulkTenths>;

/** Tenths in one Bulk: the bulk facet's scale. */
export const TENTHS_PER_BULK = BulkTenths.parse(10);

const COPPER_PER_SILVER = CopperValue.parse(10);
const COPPER_PER_GOLD = CopperValue.parse(100);
const COPPER_PER_PLATINUM = CopperValue.parse(1000);

const COPPER_PER_COIN: Readonly<Record<Coin, CopperValue>> = {
  [Coin.Platinum]: COPPER_PER_PLATINUM,
  [Coin.Gold]: COPPER_PER_GOLD,
  [Coin.Silver]: COPPER_PER_SILVER,
  [Coin.Copper]: CopperValue.parse(1),
};

const BULK_WEIGHT_TENTHS: Readonly<Record<BulkWeight, BulkTenths>> = {
  [BulkWeight.Negligible]: BulkTenths.parse(0),
  [BulkWeight.Light]: BulkTenths.parse(1),
};

const MAGICAL = Trait.parse('magical');

/** A price as printed, in copper: a batch's price ("1 sp for 10") is the batch's, not one item's. */
export function priceInCopper({ coins }: Price): CopperValue {
  const total = Object.values(Coin).reduce((sum, coin) => sum + (coins[coin] ?? 0) * COPPER_PER_COIN[coin], 0);
  return CopperValue.parse(total);
}

export function bulkInTenths(bulk: Bulk): BulkTenths {
  return typeof bulk === 'number' ? BulkTenths.parse(bulk * TENTHS_PER_BULK) : BULK_WEIGHT_TENTHS[bulk];
}

/** An item's price in copper; `undefined` (unknown) for one with no price. */
export function itemPrice({ data }: EquipmentEntry): CopperValue | undefined {
  return data.price === undefined ? undefined : priceInCopper(data.price);
}

/** An item's Bulk in tenths; `undefined` (unknown) for a kit, whose Bulk is its contents'. */
export function itemBulk(entry: EquipmentEntry): BulkTenths | undefined {
  return entry.kind === ContentKind.Kit ? undefined : bulkInTenths(entry.data.bulk);
}

/** Kinds whose use is fixed: armour is worn, a shield held, a rune etched; treasure and kits aren't used. */
const FIXED_USAGE: Readonly<Partial<Record<EquipmentKind, readonly UsageValue[]>>> = {
  [EquipmentKind.Armor]: [UsageValue.Worn],
  [EquipmentKind.Shield]: [UsageValue.Held],
  [EquipmentKind.Rune]: [UsageValue.Etched],
  [EquipmentKind.Treasure]: [],
  [EquipmentKind.Kit]: [],
};

/**
 * How an item is used: fixed for some kinds (`FIXED_USAGE`); a weapon says, and equipment or a consumable may
 * (`undefined`, unknown, when it doesn't).
 */
export function itemUsage(entry: EquipmentEntry): readonly (UsageValue | undefined)[] {
  const fixed = FIXED_USAGE[entry.kind];
  if (fixed !== undefined) {
    return fixed;
  }
  return 'usage' in entry.data ? [entry.data.usage?.type] : [undefined];
}

export function isMagical({ traits }: EquipmentEntry): boolean {
  return traits.includes(MAGICAL);
}
