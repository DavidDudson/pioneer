import { BulkWeight, Coin, ContentKind, ItemCount } from '@pioneer/rules/sdk';
import type { AttributeModifier, Bulk, ContentId, ItemContainer } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { Coins, Inventory, InventoryItem, InventoryItemId } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';
import { CarryState } from './item-carry';

/**
 * Bulk counted in tenths, so light items add up exactly (ADR-0027): negligible 0, light 1, 1 Bulk 10. Worked out on
 * every read and never stored, so it is not a Postgres column's size.
 */
export const LightBulk = z.int().nonnegative().brand<'LightBulk'>();
export type LightBulk = z.infer<typeof LightBulk>;

/** Whole Bulk, fractions dropped: what the limits compare. */
export const WholeBulk = z.int().nonnegative().brand<'WholeBulk'>();
export type WholeBulk = z.infer<typeof WholeBulk>;

/** A Bulk limit: 5 or 10 plus the Strength modifier, which is never below -5. */
export const BulkLimit = z.int().nonnegative().brand<'BulkLimit'>();
export type BulkLimit = z.infer<typeof BulkLimit>;

/** How many of one item, or of coins, are counted together: more than one line or one coin holds. */
const ItemTotal = z.int().nonnegative().brand<'ItemTotal'>();
type ItemTotal = z.infer<typeof ItemTotal>;

const LIGHT = LightBulk.parse(1);
const ONE_BULK = LightBulk.parse(10);
const NO_BULK = LightBulk.parse(0);
const ONE = ItemCount.parse(1);

/** How many coins, of every kind together, weigh 1 Bulk. */
const COINS_PER_BULK = ItemCount.parse(1000);

/** The most whole Bulk a character carries before it is encumbered, less its Strength modifier. */
const ENCUMBERED_AFTER = BulkLimit.parse(5);
/** The most whole Bulk a character can carry, less its Strength modifier. */
const MAXIMUM = BulkLimit.parse(10);

/** `bulk` in tenths. */
export function lightBulk(bulk: Bulk): LightBulk {
  if (bulk === BulkWeight.Negligible) {
    return NO_BULK;
  }
  return bulk === BulkWeight.Light ? LIGHT : LightBulk.parse(bulk * ONE_BULK);
}

/** `light` as whole Bulk, the fraction dropped. */
export function wholeBulk(light: LightBulk): WholeBulk {
  return WholeBulk.parse(Math.floor(light / ONE_BULK));
}

function sum(values: readonly LightBulk[]): LightBulk {
  return LightBulk.parse(values.reduce((total, value) => total + value, 0));
}

/** `count` items when `per` of them weigh `bulk`: only whole batches weigh anything, so 9 arrows are negligible. */
function batchBulk(bulk: LightBulk, count: ItemTotal, per: ItemCount): LightBulk {
  return LightBulk.parse(Math.floor(count / per) * bulk);
}

/** The container fields of `entry`, when it is one. */
function containerOf(entry: ItemEntry): ItemContainer | undefined {
  return entry.kind === ContentKind.Equipment ? entry.data.container : undefined;
}

/** What items are weighed against: the content, and what each container holds. */
interface BulkContext {
  readonly content: ItemContent;
  readonly contents: ReadonlyMap<InventoryItemId, readonly InventoryItem[]>;
}

/** An inventory line with its content. */
interface Weighed {
  readonly item: InventoryItem;
  readonly entry: ItemEntry;
}

/**
 * What `item` holds, less the Bulk the container ignores (a backpack's first 2) however it is carried. Nothing is
 * ignored once it holds more whole Bulk than its capacity, light items dropped, as Foundry pf2e has it.
 */
function contentsBulk(context: BulkContext, { item, entry }: Weighed): LightBulk {
  const inside = context.contents.get(item.id) ?? [];
  const container = containerOf(entry);
  const held = levelBulk(context, inside);
  const overfilled = container?.capacity !== undefined && wholeBulk(held) > container.capacity;
  const ignored = overfilled ? NO_BULK : (container?.ignored ?? 0) * ONE_BULK;
  return LightBulk.parse(Math.max(held - ignored, 0));
}

/** One line's Bulk, with what it holds: a container's own Bulk differs held or stowed from worn. */
function lineBulk(context: BulkContext, weighed: Weighed): LightBulk {
  const { item, entry } = weighed;
  const held = item.carry.state === CarryState.Worn ? undefined : containerOf(entry)?.heldBulk;
  const own = LightBulk.parse(item.quantity * lightBulk(held ?? entry.data.bulk));
  return sum([own, contentsBulk(context, weighed)]);
}

/** Lines of content sold in batches, added up by content before batches are counted, as Foundry pf2e stacks them. */
function batchedBulk(batched: readonly Weighed[]): LightBulk {
  const byContent = Map.groupBy(batched, ({ item }): ContentId => item.item);
  return sum(
    [...byContent.values()].flatMap(([first, ...rest]) => {
      if (first === undefined) {
        return [];
      }
      const count = ItemTotal.parse([first, ...rest].reduce((total, { item }) => total + item.quantity, 0));
      return [batchBulk(lightBulk(first.entry.data.bulk), count, first.entry.data.bulkPer ?? ONE)];
    }),
  );
}

/** Whether a line's content is sold in batches: 10 arrows, 1,000 coins. */
function isBatched({ entry }: Weighed): boolean {
  return (entry.data.bulkPer ?? ONE) > ONE;
}

/**
 * The Bulk of `items` side by side, in one container or loose. Lines of the same content sold in batches add up first
 * (`batchedBulk`), so 5 arrows and 5 more are light; each other line counts on its own with what it holds. An item no
 * loaded pack has weighs nothing itself, but what it holds still counts, none of it ignored.
 */
function levelBulk(context: BulkContext, items: readonly InventoryItem[]): LightBulk {
  const weighed = items.flatMap((item): Weighed[] => {
    const entry = context.content.get(item.item);
    return entry === undefined ? [] : [{ item, entry }];
  });
  const unknown = items
    .filter((item) => !context.content.has(item.item))
    .map((item) => levelBulk(context, context.contents.get(item.id) ?? []));
  const single = weighed.filter((each) => !isBatched(each)).map((each) => lineBulk(context, each));
  return sum([...single, ...unknown, batchedBulk(weighed.filter((each) => isBatched(each)))]);
}

/** Coins weigh 1 Bulk a thousand, of every kind together; fewer weigh nothing. */
export function coinBulk(coins: Coins): LightBulk {
  const count = ItemTotal.parse(coins[Coin.Platinum] + coins[Coin.Gold] + coins[Coin.Silver] + coins[Coin.Copper]);
  return batchBulk(ONE_BULK, count, COINS_PER_BULK);
}

/** What each container holds, by the container's id. */
function contentsByContainer(items: readonly InventoryItem[]): ReadonlyMap<InventoryItemId, readonly InventoryItem[]> {
  const contents = new Map<InventoryItemId, InventoryItem[]>();
  for (const each of items) {
    if (each.container !== undefined) {
      contents.set(each.container, [...(contents.get(each.container) ?? []), each]);
    }
  }
  return contents;
}

/**
 * The Bulk the character carries: every item but those dropped, each container with what it holds, and the coins.
 * Fractions are kept, in tenths; the limits drop them (`wholeBulk`).
 */
export function carriedBulk(inventory: Inventory, content: ItemContent): LightBulk {
  const context = { content, contents: contentsByContainer(inventory.items) };
  const loose = inventory.items.filter(
    (each) => each.container === undefined && each.carry.state !== CarryState.Dropped,
  );
  return sum([levelBulk(context, loose), coinBulk(inventory.coins)]);
}

/** Whether the character carries more than it should: encumbered past one limit, over its maximum past the other. */
export const Encumbrance = {
  Unencumbered: 'unencumbered',
  Encumbered: 'encumbered',
  OverMaximum: 'overMaximum',
} as const;
export type Encumbrance = ValueOf<typeof Encumbrance>;

/** The Bulk a character carries against its limits. */
export interface InventoryBulk {
  readonly carried: LightBulk;
  /** It is encumbered carrying more than this: 5 plus its Strength modifier. */
  readonly encumberedAfter: BulkLimit;
  /** It can carry no more than this: 10 plus its Strength modifier. */
  readonly maximum: BulkLimit;
  readonly encumbrance: Encumbrance;
}

function limit(base: BulkLimit, strength: AttributeModifier): BulkLimit {
  return BulkLimit.parse(base + strength);
}

function encumbranceOf(carried: WholeBulk, encumberedAfter: BulkLimit, maximum: BulkLimit): Encumbrance {
  if (carried > maximum) {
    return Encumbrance.OverMaximum;
  }
  return carried > encumberedAfter ? Encumbrance.Encumbered : Encumbrance.Unencumbered;
}

/**
 * The Bulk the character carries (`carriedBulk`), its limits from `strength`, and whether it is encumbered: carrying
 * more whole Bulk than 5 plus its Strength modifier, or more than its maximum of 10 plus it. Over the maximum is
 * shown, never refused, since a drop in Strength or a Foundry sync can put a character there.
 */
export function inventoryBulk(inventory: Inventory, content: ItemContent, strength: AttributeModifier): InventoryBulk {
  const carried = carriedBulk(inventory, content);
  const encumberedAfter = limit(ENCUMBERED_AFTER, strength);
  const maximum = limit(MAXIMUM, strength);
  return {
    carried,
    encumberedAfter,
    maximum,
    encumbrance: encumbranceOf(wholeBulk(carried), encumberedAfter, maximum),
  };
}
