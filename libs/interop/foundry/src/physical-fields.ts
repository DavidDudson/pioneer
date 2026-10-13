import { BulkCount, BulkWeight, Coin, Size, UsageHands, UsageType } from '@pioneer/rules/sdk';
import type { Bulk, UsageHands as Hands } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { boundedRecord, FOUNDRY_SIZES, setFields } from './kind-fields';
import { activationsOf } from './translate-activations';

/**
 * The fields every Foundry physical item has (content-model.md, "Equipment data"): its price in coins, its Bulk, size,
 * hardness, Hit Points and precious material, and how it is used. How many there are, which container holds one,
 * whether it is equipped or identified, and its current Hit Points are play state, not content.
 */

/** `system` fields every physical kind reads here or leaves as play state. */
export const PHYSICAL_FIELDS: readonly string[] = [
  'price',
  'bulk',
  'size',
  'hardness',
  'hp',
  'material',
  'quantity',
  'containerId',
  'equipped',
  'identification',
  'temporary',
];

const FIELD_MAX = 64;
const USAGE_MAX = 200;
/** Ten times the longest description at `pf2e-8.6.0`, as in `foundry-document.ts`. */
const DESCRIPTION_MAX = 100_000;

const FoundryPrice = z.looseObject({
  value: boundedRecord(z.number()).default({}),
  per: z.number().int().nullish(),
});
type FoundryPrice = z.infer<typeof FoundryPrice>;

/** Foundry's Bulk: 0 is negligible, 0.1 light, a whole number that many Bulk; a container's also how much it holds. */
const FoundryBulk = z.looseObject({
  value: z.number(),
  heldOrStowed: z.number().nullish(),
  capacity: z.number().nullish(),
  ignored: z.number().nullish(),
});
export type FoundryBulk = z.infer<typeof FoundryBulk>;

/** The physical part of an item's `system`, which each physical kind's schema extends. */
export const FoundryPhysicalSystem = z.looseObject({
  price: FoundryPrice.nullish(),
  bulk: FoundryBulk.nullish(),
  size: z.string().max(FIELD_MAX).nullish(),
  hardness: z.number().nullish(),
  hp: z.looseObject({ max: z.number() }).nullish(),
  material: z
    .looseObject({ type: z.string().max(FIELD_MAX).nullish(), grade: z.string().max(FIELD_MAX).nullish() })
    .nullish(),
  usage: z.looseObject({ value: z.string().max(USAGE_MAX).nullish() }).nullish(),
  description: z.looseObject({ value: z.string().max(DESCRIPTION_MAX).nullish() }).nullish(),
});
export type FoundryPhysicalSystem = z.infer<typeof FoundryPhysicalSystem>;

const COINS: readonly Coin[] = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper];

/** A price for one item needs no `per`. */
const SINGLE = 1;

/** Foundry's coins with the unpaid ones left out, and the batch it is for; no price when every coin is zero. */
export function priceOf(price: FoundryPrice | null | undefined): object {
  const coins = price?.value ?? {};
  const paid = COINS.filter((coin) => (coins[coin] ?? 0) > 0).map((coin) => [coin, coins[coin]] as const);
  const per = price?.per ?? SINGLE;
  return paid.length === 0
    ? {}
    : { price: { coins: Object.fromEntries(paid), ...setFields({ per: per > SINGLE ? per : undefined }) } };
}

/** Foundry's light Bulk, a tenth of 1 Bulk. */
const LIGHT = 0.1;

/** Foundry's Bulk as Pioneer's, when it is negligible, light or a whole number. */
export function bulkOf(value: number): Bulk | undefined {
  if (value === 0) {
    return BulkWeight.Negligible;
  }
  if (value === LIGHT) {
    return BulkWeight.Light;
  }
  const count = BulkCount.safeParse(value);
  return count.success ? count.data : undefined;
}

/** Ammunition comes in stacks of ten, coins of a thousand, gems of two thousand. */
const AMMUNITION_STACK = 10;
const COIN_STACK = 1000;
const GEM_STACK = 2000;

/**
 * How many items Foundry's Bulk is for, by its stack group (`STACK_DEFINITIONS`), which Foundry keeps in code: ten
 * arrows are light, a thousand coins are 1 Bulk. Ammunition takes its group from its type, treasure from its category.
 */
const STACK_SIZES: ReadonlyMap<string, number> = new Map([
  ['arrows', AMMUNITION_STACK],
  ['bolts', AMMUNITION_STACK],
  ['sling-bullets', AMMUNITION_STACK],
  ['blowgun-darts', AMMUNITION_STACK],
  ['wooden-taws', AMMUNITION_STACK],
  ['rounds', AMMUNITION_STACK],
  ['coin', COIN_STACK],
  ['gem', GEM_STACK],
]);

/** The stack a stack group's Bulk is for, when it has one. */
export function stackSize(group: string | undefined): number | undefined {
  return group === undefined ? undefined : STACK_SIZES.get(group);
}

/**
 * The physical fields of an item, unparsed, with `bulkPer` when its Bulk is for a stack; undefined when its Bulk does
 * not map, as every physical kind has one. Medium size, no hardness and no Hit Points are Foundry's defaults and say
 * nothing.
 */
export function physicalData(system: FoundryPhysicalSystem, input: KindInput, bulkPer?: number): object | undefined {
  const { log, document } = input;
  const value = system.bulk?.value ?? 0;
  const bulk = bulkOf(value);
  if (bulk === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'bulk.value', raw: value });
    return undefined;
  }
  return {
    ...priceOf(system.price),
    bulk,
    ...setFields({
      bulkPer: bulk === BulkWeight.Negligible ? undefined : bulkPer,
      size: sizeOf(system.size, log),
      hardness: (system.hardness ?? 0) > 0 ? system.hardness : undefined,
      hitPoints: (system.hp?.max ?? 0) > 0 ? system.hp?.max : undefined,
      material: materialOf(system.material),
    }),
    ...activationsOf(system.description?.value ?? '', document.name, log),
  };
}

/** A size other than medium; an unknown one is reported. */
function sizeOf(size: string | null | undefined, log: GapLog): Size | undefined {
  if (size === null || size === undefined) {
    return undefined;
  }
  const mapped = FOUNDRY_SIZES.get(size);
  if (mapped === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'size', raw: size });
  }
  return mapped === Size.Medium ? undefined : mapped;
}

function materialOf(material: FoundryPhysicalSystem['material']): object | undefined {
  const type = material?.type ?? undefined;
  return type === undefined ? undefined : { type, ...setFields({ grade: material?.grade ?? undefined }) };
}

const HELD: ReadonlyMap<string, Hands> = new Map([
  ['held-in-one-hand', UsageHands.One],
  ['held-in-one-plus-hands', UsageHands.OnePlus],
  ['held-in-two-hands', UsageHands.Two],
]);

/** Usages with nothing more to them. */
const BARE: ReadonlyMap<string, UsageType> = new Map([
  ['worn', UsageType.Worn],
  ['tattooed-on-the-body', UsageType.Tattooed],
  ['implanted', UsageType.Implanted],
  ['carried', UsageType.Carried],
  ['other', UsageType.Other],
  // Bonded to one character (a mirror): Pioneer has no usage of its own for it yet.
  ['bonded', UsageType.Other],
]);

/** Usages that name what the item goes on after a prefix: `affixed-to-armor`. */
const TARGETED: readonly (readonly [string, UsageType])[] = [
  ['affixed-to-', UsageType.Affixed],
  ['attached-to-', UsageType.Attached],
  ['applied-to-', UsageType.Applied],
  ['installed-in-', UsageType.Installed],
  ['installed-on-', UsageType.Installed],
];

/** Foundry's prefix for a worn item's slot: `worncloak`. */
const WORN = 'worn';

/** A held or bare usage, which names nothing else. */
function simpleUsage(usage: string): object | undefined {
  const hands = HELD.get(usage);
  if (hands !== undefined) {
    return { type: UsageType.Held, hands };
  }
  const bare = BARE.get(usage);
  return bare === undefined ? undefined : { type: bare };
}

/**
 * Foundry's `usage` split into its parts: held in some hands, worn in a slot, affixed (or attached, applied,
 * installed) to something, or one of the bare usages. Anything else (`held-in-one-or-two-hands`) is
 * reported.
 */
export function usageOf(usage: string, log: GapLog): object | undefined {
  const simple = simpleUsage(usage);
  if (simple !== undefined) {
    return simple;
  }
  const targeted = TARGETED.find(([prefix]) => usage.startsWith(prefix));
  if (targeted !== undefined) {
    const [prefix, type] = targeted;
    return { type, to: usage.slice(prefix.length) };
  }
  if (usage.startsWith(WORN) && usage.length > WORN.length) {
    return { type: UsageType.Worn, slot: usage.slice(WORN.length) };
  }
  report(log, { reason: KindDataGapReason.UnmappedValue, field: 'usage', raw: usage });
  return undefined;
}

/** The item's usage, when Foundry gives one. */
export function usageField(system: FoundryPhysicalSystem, log: GapLog): object {
  const usage = system.usage?.value ?? undefined;
  return setFields({ usage: usage === undefined || usage === '' ? undefined : usageOf(usage, log) });
}
