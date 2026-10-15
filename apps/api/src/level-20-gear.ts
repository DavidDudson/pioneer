import {
  addItem,
  CarryState,
  carryItem,
  EMPTY_INVENTORY,
  Hands,
  handsNeeded,
  INVESTED_MAX,
  InventoryItemId,
  inventoryRefusal,
  investItem,
  isInvestable,
  isWearable,
  ItemQuantity,
  itemRefusal,
} from '@pioneer/character/domain';
import type { Carry, Inventory, InventoryItem, ItemContent, ItemEntry } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import { derivedId, FixtureNamespace } from '@pioneer/shared/kernel';

import { BUILD_LEVEL } from './level-20-fills';

const CONSUMABLES = 8;
const CONSUMABLE_QUANTITY = 2;
const WEAPONS = 2;
const FIRST = 0;

/** How much armor or a shield adds to Armor Class; nothing for any other item. */
function armorClass(entry: ItemEntry): number {
  return entry.kind === ContentKind.Armor || entry.kind === ContentKind.Shield ? entry.data.acBonus : 0;
}

/** Armor and shields by their bonus, the rest by level, highest first. */
function bestFirst(entries: readonly ItemEntry[]): ItemEntry[] {
  return entries.toSorted(
    (left, right) =>
      armorClass(right) - armorClass(left) || right.level - left.level || left.id.localeCompare(right.id),
  );
}

/** The items of `kind` at the build level or below, best first. */
function ofKind(items: ItemContent, kind: ContentKind): ItemEntry[] {
  return bestFirst([...items.values()].filter((entry) => entry.kind === kind && entry.level <= BUILD_LEVEL));
}

/** How `entry` is carried when used: worn, or held in as many hands as it needs. */
function carryOf(entry: ItemEntry): Carry {
  return isWearable(entry)
    ? { state: CarryState.Worn }
    : { state: CarryState.Held, hands: Hands.parse(handsNeeded(entry)) };
}

/** Gear is added one item at a time, each kept only when the inventory and the content allow how it is carried. */
class Gear {
  public inventory: Inventory = EMPTY_INVENTORY;
  #count = 0;
  readonly #items: ItemContent;

  public constructor(items: ItemContent) {
    this.#items = items;
  }

  /** `entry` added stowed, with `quantity`. */
  #add(entry: ItemEntry, quantity: number): InventoryItem {
    this.#count += 1;
    const id = InventoryItemId.parse(derivedId(FixtureNamespace, `item:${this.#count}`));
    const item = ItemQuantity.parse(quantity);
    this.inventory = addItem(this.inventory, { id, item: entry.id, quantity: item, container: undefined });
    const added = this.inventory.items.find((each) => each.id === id);
    if (added === undefined) {
      throw new TypeError('Item was not added');
    }
    return added;
  }

  /** Adds `entry` stowed. */
  public stow(entry: ItemEntry, quantity = 1): void {
    this.#add(entry, quantity);
  }

  /** Adds `entry` worn or held as it is used, invested when it works only invested, unless the content or limits refuse. */
  public use(entry: ItemEntry): boolean {
    const added = this.#add(entry, 1);
    const carry = carryOf(entry);
    const refused =
      inventoryRefusal(this.inventory, { id: added.id, carry }) ??
      itemRefusal(this.#items, this.inventory, { id: added.id, carry });
    if (refused !== undefined) {
      this.inventory = { ...this.inventory, items: this.inventory.items.filter((each) => each.id !== added.id) };
      return false;
    }
    this.inventory = carryItem(this.inventory, added.id, carry);
    if (isInvestable(added, entry)) {
      this.inventory = investItem(this.inventory, added.id, true);
    }
    return true;
  }
}

/** Worn items that must be invested, most powerful first, up to the limit less the armor. */
function investedWorn(items: ItemContent): ItemEntry[] {
  const worn = [...items.values()].filter(
    (entry) =>
      entry.kind === ContentKind.Equipment &&
      entry.level <= BUILD_LEVEL &&
      isWearable(entry) &&
      isInvestable(undefined, entry),
  );
  return bestFirst(worn).slice(FIRST, INVESTED_MAX - 1);
}

/** The best armor and shield in use. */
function defenses(gear: Gear, items: ItemContent): void {
  for (const kind of [ContentKind.Armor, ContentKind.Shield]) {
    const [best] = ofKind(items, kind);
    if (best !== undefined) {
      gear.use(best);
    }
  }
}

/** The best weapons in hand, and the next one stowed as a spare. */
function weapons(gear: Gear, items: ItemContent): void {
  const [...ranked] = ofKind(items, ContentKind.Weapon);
  let carried = 0;
  for (const weapon of ranked) {
    if (carried >= WEAPONS) {
      gear.stow(weapon);
      return;
    }
    if (gear.use(weapon)) {
      carried += 1;
    }
  }
}

/** The inventory of a character with the best armor, shield and weapons, invested worn items and consumables. */
export function gearedInventory(items: ItemContent): Inventory {
  const gear = new Gear(items);
  defenses(gear, items);
  weapons(gear, items);
  for (const entry of investedWorn(items)) {
    gear.use(entry);
  }
  for (const entry of ofKind(items, ContentKind.Consumable).slice(FIRST, CONSUMABLES)) {
    gear.stow(entry, CONSUMABLE_QUANTITY);
  }
  return gear.inventory;
}
