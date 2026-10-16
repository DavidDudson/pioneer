import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, KitData } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';

import { InventoryRefusalField, ItemQuantity } from './inventory';
import type { Inventory, InventoryItemId, InventoryRefusal, NewItem } from './inventory';
import { isContainer } from './inventory-content';
import type { ItemContent } from './inventory-content';
import { CORE_RULE_LIMITS } from './rule-limits';
import type { RuleLimits } from './rule-limits';

/** A kit content entry: the items it holds and what it costs as one purchase. */
export type KitEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Kit }>;

/** Every kit the loaded packs offer, by id. */
export type KitContent = ReadonlyMap<ContentId, KitEntry>;

function isKitEntry(entry: ContentEntry): entry is KitEntry {
  return entry.kind === ContentKind.Kit;
}

/** The kits in `registry`'s packs. A later pack's entry of the same id wins, as in the registry. */
export function kitContent(registry: ContentRegistry): KitContent {
  const kits = registry.packs.flatMap((pack) => pack.otherEntries.filter((entry) => isKitEntry(entry)));
  return new Map(kits.map((entry) => [entry.id, entry]));
}

/** Every item content a kit names: what it holds, and what its containers hold. */
function kitItemIds({ items }: KitData): readonly ContentId[] {
  return items.flatMap(({ item, contents = [] }) => [item, ...contents.map((inner) => inner.item)]);
}

/**
 * The inventory lines `kit` expands into, each with the id `newItemId` gives it: what it holds goes in `container`, or
 * loose when it is undefined, and what a container in the kit holds goes in that container (a backpack's rope and
 * torches).
 */
export function kitItems(
  kit: KitData,
  container: InventoryItemId | undefined,
  newItemId: () => InventoryItemId,
): readonly NewItem[] {
  return kit.items.flatMap(({ item, quantity, contents = [] }) => {
    const id = newItemId();
    const inside = contents.map((inner): NewItem => ({
      id: newItemId(),
      item: inner.item,
      quantity: ItemQuantity.parse(inner.quantity),
      container: id,
    }));
    return [{ id, item, quantity: ItemQuantity.parse(quantity), container }, ...inside];
  });
}

/** What a kit edit reads: the kits and items the loaded packs offer. */
export interface KitReads {
  readonly kits: KitContent;
  readonly items: ItemContent;
  /** The limits the table holds items to; the core rules' when absent. */
  readonly limits?: RuleLimits | undefined;
}

/** Why a kit can't be added whatever the inventory holds, as the message key that says so. */
const KitUnfit = {
  UnknownItem: 'character.validation.unknownKitItem',
  NotAContainer: 'character.validation.kitNotAContainer',
} as const;
type KitUnfit = ValueOf<typeof KitUnfit>;

/**
 * Why `kit` can't be added whatever the inventory holds: it holds an item no loaded pack has, or
 * puts items inside one whose content holds nothing. Undefined when it can.
 */
function kitContentRefusal(kit: KitData, items: ItemContent): KitUnfit | undefined {
  if (kitItemIds(kit).some((id) => !items.has(id))) {
    return KitUnfit.UnknownItem;
  }
  const holdsInNothing = kit.items.some(
    ({ item, contents = [] }) => contents.length > 0 && !isContainer(items.get(item)),
  );
  return holdsInNothing ? KitUnfit.NotAContainer : undefined;
}

/** Whether `kit` can be added at all with the loaded `items`; the shop offers only those. */
export function isKitAddable(kit: KitData, items: ItemContent): boolean {
  return kitContentRefusal(kit, items) === undefined;
}

/**
 * Refuses a kit no loaded pack has, one holding an item no loaded pack has or holding items inside one that holds
 * nothing (a kit is added whole or not at all), and one whose items would take the inventory past its limit. Where
 * its items go is `inventoryRefusal`'s and `itemRefusal`'s to check.
 */
export function kitRefusal(
  { kits, items, limits = CORE_RULE_LIMITS }: KitReads,
  inventory: Inventory,
  kit: ContentId,
): InventoryRefusal | undefined {
  const entry = kits.get(kit);
  if (entry === undefined) {
    return { field: InventoryRefusalField.Kit, message: message('character.validation.unknownKit') };
  }
  const unfit = kitContentRefusal(entry.data, items);
  if (unfit !== undefined) {
    return { field: InventoryRefusalField.Kit, message: message(unfit) };
  }
  if (inventory.items.length + kitItemIds(entry.data).length > limits.itemsMax) {
    return {
      field: InventoryRefusalField.Kit,
      message: message('character.validation.kitOverfills', { maximum: limits.itemsMax }),
    };
  }
  return undefined;
}
