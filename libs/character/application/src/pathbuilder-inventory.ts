import {
  CarryState,
  CoinAmount,
  InventoryItemId,
  InventoryItemName,
  InventorySchema,
  INVESTED_MAX,
  isInvestable,
  isSpecific,
  isWearable,
  ItemQuantity,
  ONE_HAND,
  runedItemOf,
} from '@pioneer/character/domain';
import type { Carry, Inventory, InventoryItem, ItemContent, ItemEntry, ItemRunes } from '@pioneer/character/domain';
import { ImportKind } from '@pioneer/interop/pathbuilder';
import type { ContentLookup, ImportedItem, ImportedRunes, PathbuilderImport } from '@pioneer/interop/pathbuilder';
import { ContentKind, Coin, ContentId, PROPERTY_RUNES_MAX, RuneGrade, RunedItem } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

/** What an import's gear is matched against: items and property runes by name, and what each item is. */
export interface InventoryContent {
  readonly items: ContentLookup;
  readonly runes: ContentLookup;
  readonly entries: ItemContent;
}

function grade(value: number | undefined): RuneGrade | undefined {
  const parsed = RuneGrade.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** The runes Pathbuilder lists, as far as the item takes them: armour has no striking, a weapon no resilient. */
function etched(
  runes: ImportedRunes | undefined,
  entry: ItemEntry,
  { runes: lookup }: InventoryContent,
): ItemRunes | undefined {
  const kind = runedItemOf(entry);
  if (runes === undefined || kind === undefined || isSpecific(entry)) {
    return undefined;
  }
  const property = runes.property.flatMap((name) => {
    const match = lookup.resolve(ImportKind.Item, name);
    return match === undefined ? [] : [ContentId.parse(match.id)];
  });
  return {
    potency: grade(runes.potency),
    striking: kind === RunedItem.Weapon ? grade(runes.striking) : undefined,
    resilient: kind === RunedItem.Weapon ? undefined : grade(runes.resilient),
    reinforcing: undefined,
    property: [...new Set(property)].slice(0, PROPERTY_RUNES_MAX),
  };
}

function withRunes(item: InventoryItem, runes: ItemRunes | undefined): InventoryItem {
  return runes === undefined ? item : { ...item, runes };
}

/** Worn armour (one suit), a worn shield in a hand; everything else stowed. */
function carryOf(imported: ImportedItem, entry: ItemEntry, armourWorn: boolean): Carry {
  if (!imported.worn) {
    return { state: CarryState.Stowed };
  }
  if (entry.kind === ContentKind.Shield) {
    return { state: CarryState.Held, hands: ONE_HAND };
  }
  return isWearable(entry) && !(entry.kind === ContentKind.Armor && armourWorn)
    ? { state: CarryState.Worn }
    : { state: CarryState.Stowed };
}

/** The lines built so far, and how many are invested. */
interface Stock {
  readonly items: readonly InventoryItem[];
  readonly invested: number;
}

/** The inventory line `imported` makes, or undefined when no loaded item or quantity fits. */
function lineFor(
  imported: ImportedItem,
  content: InventoryContent,
  items: readonly InventoryItem[],
): InventoryItem | undefined {
  const match = content.items.resolve(ImportKind.Item, imported.name);
  const entry = match === undefined ? undefined : content.entries.get(ContentId.parse(match.id));
  const quantity = ItemQuantity.safeParse(imported.quantity);
  if (entry === undefined || !quantity.success) {
    return undefined;
  }
  const armourWorn = items.some(
    (each) => each.carry.state === CarryState.Worn && content.entries.get(each.item)?.kind === ContentKind.Armor,
  );
  const name = InventoryItemName.safeParse(imported.displayName);
  const base: InventoryItem = {
    id: InventoryItemId.parse(newId()),
    item: entry.id,
    quantity: quantity.data,
    carry: carryOf(imported, entry, armourWorn),
    ...(name.success ? { name: name.data } : {}),
  };
  return withRunes(base, etched(imported.runes, entry, content));
}

/** `stock` with `imported` added, invested when Pathbuilder says so or it is worn, content allows and the limit has room. */
function added(stock: Stock, imported: ImportedItem, content: InventoryContent): Stock {
  const line = lineFor(imported, content, stock.items);
  if (line === undefined) {
    return stock;
  }
  const entry = content.entries.get(line.item);
  const wantsInvesting = imported.invested || line.carry.state === CarryState.Worn;
  const invests = wantsInvesting && stock.invested < INVESTED_MAX && isInvestable(line, entry);
  return {
    items: [...stock.items, invests ? { ...line, invested: true } : line],
    invested: stock.invested + (invests ? 1 : 0),
  };
}

/** The inventory an import carries: matched items with their runes, carry state and investment, and the coins. */
export function importedInventory(value: PathbuilderImport, content: InventoryContent): Inventory {
  let stock: Stock = { items: [], invested: 0 };
  for (const imported of value.items) {
    stock = added(stock, imported, content);
  }
  const { items } = stock;
  const { platinum, gold, silver, copper } = value.coins;
  return InventorySchema.parse({
    items,
    coins: {
      [Coin.Platinum]: CoinAmount.parse(platinum),
      [Coin.Gold]: CoinAmount.parse(gold),
      [Coin.Silver]: CoinAmount.parse(silver),
      [Coin.Copper]: CoinAmount.parse(copper),
    },
  });
}
