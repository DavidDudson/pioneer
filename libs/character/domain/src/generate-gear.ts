import { Attribute, Coin, COPPER_PER_COIN, ContentKind, CopperValue, Rarity } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import type { Temporal } from '@pioneer/shared/kernel';
import { derivedId, UuidNamespace } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { attributeModifiers } from './attribute-boosts';
import { Encumbrance, inventoryBulk } from './bulk';
import type { Character } from './character';
import { CharacterPatchField } from './character-patch';
import type { WeaponTheme } from './generation-theme';
import { CoinAmount, CoinsSchema, InventoryItemId, inventoryRefusal, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { handsNeeded, isWearable, itemRefusal } from './inventory-content';
import type { ItemContent, ItemEntry } from './inventory-content';
import { CarryState, Hands } from './item-carry';
import type { Carry } from './item-carry';
import type { RuneContent } from './item-runes';
import { seededPicks } from './pick-source';
import type { PickSource, Seed } from './pick-source';
import { shuffle } from './picks';
import { coinsOf, coinsValue, purchaseCost } from './purse';
import type { SlotContent } from './slot-offer';
import { CORE_TREASURE_BY_LEVEL, treasureAt } from './treasure-by-level';
import type { TreasureByLevel } from './treasure-by-level';
import { etchWeapon } from './weapon-runes';

/** What `generateGear` is asked for: the character to equip, what to read and the table of what it may own. */
export interface GearInput {
  /** The character to equip, at the level it is to be equipped for. */
  readonly character: Character;
  readonly seed: Seed;
  readonly items: ItemContent;
  readonly slots: SlotContent;
  readonly now: Temporal.Instant;
  /** What a character of each level may own; the core rules' by default (ADR-0064). */
  readonly treasure?: TreasureByLevel | undefined;
  /** The weapon to equip, when the character is themed on one: bought if it is on sale, then given its best runes. */
  readonly weapon?: WeaponTheme | undefined;
  /** The runes on sale; without them a themed weapon is equipped bare. */
  readonly runes?: RuneContent | undefined;
}

/** Where gear is bought: the items on sale, the Strength that limits what can be carried, and the draws. */
interface Shop {
  readonly items: ItemContent;
  readonly slots: SlotContent;
  readonly source: PickSource;
  readonly now: Temporal.Instant;
}

/** What one purchase is for: the kinds to pick from, the share of the coins left it may cost, and whether it is used. */
interface Want {
  readonly kinds: readonly ContentKind[];
  /** The purchase costs at most this fraction's worth of the coins left: 3 is a third. */
  readonly share: Share;
  /** Whether the item is worn or held as it is used, rather than stowed. */
  readonly used: boolean;
  /** When given, only the weapons of this theme's group and base are picked from. */
  readonly only?: WeaponTheme | undefined;
}

/** Whether `entry` is a weapon of the group and base `theme` names, with no runes of its own so it can take the best. */
export function fitsTheme(entry: ItemEntry, { group, base }: WeaponTheme): boolean {
  return (
    entry.kind === ContentKind.Weapon &&
    entry.data.runes === undefined &&
    (group === undefined || entry.data.group === group) &&
    (base === undefined || entry.data.baseItem === base)
  );
}

/** The fraction of the coins left one purchase may cost, as its divisor: 3 is a third. */
const Share = z.int().positive().brand<'Share'>();
type Share = z.infer<typeof Share>;

/** Namespace of the ids a generated character's gear takes, so the same character and seed give the same lines. */
const GEAR_NAMESPACE = UuidNamespace.parse('b3e5a7c1-4d29-4f68-a0b4-6c1e8f2d9a35');

/** How many items a purchase tries before it gives up: a heavy or refused pick is dropped for the next. */
const ATTEMPTS_MAX = 25;
const ONE_ITEM = ItemQuantity.parse(1);
const FREE = CopperValue.parse(0);
const NO_COINS = CoinsSchema.parse({});

/**
 * The most coins a generated character keeps unspent: 1,000 coins weigh 1 Bulk, so a purse of the level 20 budget would
 * weigh more than a character can carry. What the budget leaves beyond this is not carried at all.
 */
const PURSE_GOLD = CoinAmount.parse(9000);
const PURSE_MAX = CopperValue.parse(PURSE_GOLD * COPPER_PER_COIN[Coin.Gold]);

const THIRD = Share.parse(3);
const QUARTER = Share.parse(4);
const FIFTH = Share.parse(5);

const ARMOR: Want = { kinds: [ContentKind.Armor], share: THIRD, used: true };
const WEAPON: Want = { kinds: [ContentKind.Weapon], share: THIRD, used: true };
const SHIELD: Want = { kinds: [ContentKind.Shield], share: QUARTER, used: true };
const EXTRA: Want = { kinds: [ContentKind.Consumable, ContentKind.Equipment], share: FIFTH, used: false };
/** How many extras a character is outfitted with, when its coins allow. */
const EXTRAS_MAX = 6;

/** What one of `entry` costs; none for an item with no price. */
function priceOf(entry: ItemEntry): CopperValue | undefined {
  return entry.data.price === undefined ? undefined : purchaseCost(entry.data.price, ONE_ITEM);
}

/** What the lines of `inventory` are worth at their content's prices. */
export function itemsValue(inventory: Inventory, items: ItemContent): CopperValue {
  let total = 0;
  for (const line of inventory.items) {
    const price = items.get(line.item)?.data.price;
    total += price === undefined ? FREE : purchaseCost(price, line.quantity);
  }
  return CopperValue.parse(total);
}

/** How `entry` is used: worn, or held in as many hands as it takes. */
function carryOf(entry: ItemEntry): Carry {
  return isWearable(entry)
    ? { state: CarryState.Worn }
    : { state: CarryState.Held, hands: Hands.parse(handsNeeded(entry)) };
}

/** Whether `character` carries no more than it can without being encumbered, its coins aside (`PURSE_MAX`). */
function unencumbered(character: Character, shop: Shop): boolean {
  const { document } = character;
  const strength = attributeModifiers(document, shop.slots.boosts).get(Attribute.Strength);
  return (
    inventoryBulk({ ...document.inventory, coins: NO_COINS }, shop.items, strength).encumbrance ===
    Encumbrance.Unencumbered
  );
}

/** A line of the inventory and the content it is. */
interface Line {
  readonly id: InventoryItemId;
  readonly entry: ItemEntry;
}

/** A character, and what it is buying. */
interface Buying {
  readonly character: Character;
  readonly want: Want;
}

/** `character` using the line `id` as `entry` is used, or undefined when the content or the limits refuse. */
function using(character: Character, line: Line, shop: Shop): Character | undefined {
  const { id, entry } = line;
  const carry = carryOf(entry);
  const { inventory } = character.document;
  const refused = inventoryRefusal(inventory, { id, carry }) ?? itemRefusal(shop.items, inventory, { id, carry });
  return refused === undefined
    ? character.apply({ field: CharacterPatchField.CarryItem, id, carry }, shop.now)
    : undefined;
}

/** `character` with `entry` bought, used if `want` says so; undefined when it is refused or leaves it encumbered. */
function attempt({ character, want }: Buying, entry: ItemEntry, shop: Shop): Character | undefined {
  const cost = priceOf(entry);
  const { inventory } = character.document;
  const id = InventoryItemId.parse(derivedId(GEAR_NAMESPACE, `${character.id}:${inventory.items.length}`));
  if (cost === undefined || inventoryRefusal(inventory, { item: entry.id }) !== undefined) {
    return undefined;
  }
  const patch = { field: CharacterPatchField.BuyItem, item: entry.id, quantity: ONE_ITEM, container: undefined };
  const bought = character.apply(patch, shop.now, { newItemId: id, cost });
  const equipped = want.used ? using(bought, { id, entry }, shop) : bought;
  return equipped !== undefined && unencumbered(equipped, shop) ? equipped : undefined;
}

/** Whether `entry` is a weapon that is worn, such as handwraps, which is not one a character holds. */
function wornWeapon(entry: ItemEntry): boolean {
  return entry.kind === ContentKind.Weapon && isWearable(entry);
}

/**
 * The items `character` may buy for `want` with at most `cap`: common, no higher in level than it, and priced. A
 * weapon bought for use is one it can hold.
 */
function candidates({ character, want }: Buying, cap: CopperValue, shop: Shop): readonly ItemEntry[] {
  const owned = new Set<ContentId>(character.document.inventory.items.map((line) => line.item));
  return [...shop.items.values()].filter((entry) => {
    const cost = priceOf(entry);
    return (
      want.kinds.includes(entry.kind) &&
      (want.only === undefined || fitsTheme(entry, want.only)) &&
      !(want.used && wornWeapon(entry)) &&
      entry.rarity === Rarity.Common &&
      entry.level <= character.document.level &&
      cost !== undefined &&
      cost > FREE &&
      cost <= cap &&
      !owned.has(entry.id)
    );
  });
}

/** How many levels below the best item on offer a purchase may still be: gear is bought near the top of what the level allows. */
const LEVEL_BAND = 2;

/** The items within `LEVEL_BAND` levels of the highest in `offer`. */
function topOf(offer: readonly ItemEntry[]): readonly ItemEntry[] {
  const best = Math.max(...offer.map((entry) => entry.level), 0);
  return offer.filter((entry) => entry.level + LEVEL_BAND >= best);
}

/**
 * `character` with one purchase for `want`, picked at random from near the top of what its level allows, or as it was
 * when nothing fits. Gear that is used falls back to anything on offer, so a weak character that can carry none of the
 * best still holds a weapon.
 */
function buy(character: Character, want: Want, shop: Shop): Character {
  const left = coinsValue(character.document.inventory.coins);
  const cap = CopperValue.parse(Math.floor(left / want.share));
  const offer = candidates({ character, want }, cap, shop);
  const pools = want.used ? [topOf(offer), offer] : [topOf(offer)];
  for (const pool of pools) {
    for (const entry of shuffle(shop.source, pool).slice(0, ATTEMPTS_MAX)) {
      const bought = attempt({ character, want }, entry, shop);
      if (bought !== undefined) {
        return bought;
      }
    }
  }
  return character;
}

/** The weapon a themed character is armed with, and the runes it may be etched with. */
interface Armament {
  readonly weapon: WeaponTheme | undefined;
  readonly runes: RuneContent | undefined;
}

/**
 * `character` with the weapon its theme names bought and held, and etched with the best runes the coins allow; with
 * the ordinary weapon when no themed one can be bought, or when there is no theme.
 */
function armed(character: Character, shop: Shop, themed: Armament): Character {
  const { weapon, runes } = themed;
  if (weapon === undefined) {
    return buy(character, WEAPON, shop);
  }
  const bought = buy(character, { ...WEAPON, only: weapon }, shop);
  const line = bought.document.inventory.items.at(-1);
  const gained = bought.document.inventory.items.length > character.document.inventory.items.length;
  if (!gained || line === undefined) {
    return buy(character, WEAPON, shop);
  }
  return runes === undefined
    ? bought
    : etchWeapon(bought, line.id, { items: shop.items, runes, now: shop.now, source: shop.source });
}

/** `character` with the coins of its level's budget, less what its items are already worth. */
function funded(character: Character, shop: Shop, treasure: TreasureByLevel): Character {
  const { document } = character;
  const budget = treasureAt(treasure, document.level);
  const owned = itemsValue(document.inventory, shop.items);
  const coins = coinsOf(CopperValue.parse(Math.max(budget - owned, FREE)));
  return character.apply({ field: CharacterPatchField.SetCoins, coins }, shop.now);
}

/** `character` keeping no more coins than `PURSE_MAX`. */
function purseTrimmed(character: Character, shop: Shop): Character {
  const left = Math.min(coinsValue(character.document.inventory.coins), PURSE_MAX);
  const coins = coinsOf(CopperValue.parse(left));
  return character.apply({ field: CharacterPatchField.SetCoins, coins }, shop.now);
}

/**
 * `character` outfitted for its level: the coins of the level's budget (`treasure`, less what it already owns) spent
 * on armour worn, a weapon and perhaps a shield in hand, and a few things stowed. Every item is common, no higher in
 * level than the character, within what the coins left cover and what it can carry unencumbered, and used only as its
 * content and the inventory limits allow. Coins left over stay in the purse, so items and coins together never pass
 * the budget. The same seed and character give the same gear.
 */
export function generateGear({
  character,
  seed,
  items,
  slots,
  now,
  treasure = CORE_TREASURE_BY_LEVEL,
  weapon,
  runes,
}: GearInput): Character {
  const shop: Shop = { items, slots, source: seededPicks(seed), now };
  const wants = [ARMOR, WEAPON, SHIELD, ...Array.from({ length: EXTRAS_MAX }, () => EXTRA)];
  let outfitted = funded(character, shop, treasure);
  for (const want of wants) {
    outfitted = want === WEAPON ? armed(outfitted, shop, { weapon, runes }) : buy(outfitted, want, shop);
  }
  return purseTrimmed(outfitted, shop);
}
