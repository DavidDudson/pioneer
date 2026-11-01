import {
  CarryState,
  CoinAmount,
  InventoryItemId,
  InventoryItemName,
  InventorySchema,
  isContainer,
  isInvestable,
  isSpecific,
  isWearable,
  ItemOrigin,
  ItemQuantity,
  ONE_HAND,
  runedItemOf,
} from '@pioneer/character/domain';
import type {
  Carry,
  CustomItem,
  Inventory,
  InventoryItem,
  ItemContent,
  ItemEntry,
  ItemRunes,
} from '@pioneer/character/domain';
import { ImportKind, PathbuilderName } from '@pioneer/interop/pathbuilder';
import type {
  ContentLookup,
  ImportedContainer,
  ImportedItem,
  ImportedRunes,
  PathbuilderContainerKey,
  PathbuilderImport,
} from '@pioneer/interop/pathbuilder';
import { Coin, ContentId, ContentKind, RunedItem, RuneGrade } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

/** What an import's gear is matched against: items and property runes by name, and what each item is. */
export interface InventoryContent {
  readonly items: ContentLookup;
  readonly runes: ContentLookup;
  readonly entries: ItemContent;
}

/** The core item Pathbuilder's backpack flag stands for. */
const BACKPACK = PathbuilderName.parse('Backpack');

/** The core item Pathbuilder's bag of holding flag stands for: the remaster renamed the bag a spacious pouch. */
const BAG_OF_HOLDING = PathbuilderName.parse('Spacious Pouch (Type I)');

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
    property: [...new Set(property)],
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

/** The inventory line `imported` makes, or undefined when no loaded item or quantity fits. */
/** What a line is placed against: the lines made so far, and the item each Pathbuilder container became. */
interface Placed {
  readonly items: readonly InventoryItem[];
  readonly containers: ReadonlyMap<PathbuilderContainerKey, InventoryItemId>;
}

function lineFor(imported: ImportedItem, content: InventoryContent, placed: Placed): InventoryItem | undefined {
  const match = content.items.resolve(ImportKind.Item, imported.name);
  const entry = match === undefined ? undefined : content.entries.get(ContentId.parse(match.id));
  const quantity = ItemQuantity.safeParse(imported.quantity);
  if (entry === undefined || !quantity.success) {
    return undefined;
  }
  const { items, containers } = placed;
  const container = imported.container === undefined ? undefined : containers.get(imported.container);
  const armourWorn = items.some(
    (each) => each.carry.state === CarryState.Worn && content.entries.get(each.item)?.kind === ContentKind.Armor,
  );
  const name = InventoryItemName.safeParse(imported.displayName);
  const base: InventoryItem = {
    id: InventoryItemId.parse(newId()),
    item: entry.id,
    quantity: quantity.data,
    carry: carryOf(imported, entry, armourWorn),
    origin: ItemOrigin.Import,
    ...(name.success ? { name: name.data } : {}),
    ...(container === undefined ? {} : { container }),
  };
  return withRunes(base, etched(imported.runes, entry, content));
}

/** The core container `container` is: its own name when that names one, else the item its backpack or bag flag stands for. */
function containerEntry(container: ImportedContainer, content: InventoryContent): ItemEntry | undefined {
  const names = [
    container.name,
    ...(container.backpack ? [BACKPACK] : []),
    ...(container.bagOfHolding ? [BAG_OF_HOLDING] : []),
  ];
  for (const name of names) {
    const match = content.items.resolve(ImportKind.Item, name);
    const entry = match === undefined ? undefined : content.entries.get(ContentId.parse(match.id));
    if (entry !== undefined && isContainer(entry)) {
      return entry;
    }
  }
  return undefined;
}

/** A stowed line for each of Pathbuilder's containers that is a core container, by the key its rows name. */
function containerLines(
  value: PathbuilderImport,
  content: InventoryContent,
): ReadonlyMap<PathbuilderContainerKey, InventoryItem> {
  const lines = new Map<PathbuilderContainerKey, InventoryItem>();
  for (const container of value.containers) {
    const entry = containerEntry(container, content);
    if (entry !== undefined) {
      lines.set(container.key, {
        id: InventoryItemId.parse(newId()),
        item: entry.id,
        quantity: ItemQuantity.parse(1),
        carry: { state: CarryState.Stowed },
        origin: ItemOrigin.Import,
      });
    }
  }
  return lines;
}

/** `line` as an import keeps it: invested when Pathbuilder says so or it is worn and content allows, past any limit. */
function investedAs(line: InventoryItem, imported: ImportedItem, content: InventoryContent): InventoryItem {
  const wantsInvesting = imported.invested || line.carry.state === CarryState.Worn;
  return wantsInvesting && isInvestable(line, content.entries.get(line.item)) ? { ...line, invested: true } : line;
}

/** The custom item an unmatched `imported` line makes, or undefined when its name or quantity can't be one. */
function customFor(imported: ImportedItem): CustomItem | undefined {
  const name = InventoryItemName.safeParse(imported.name);
  const quantity = ItemQuantity.safeParse(imported.quantity);
  return name.success && quantity.success
    ? { id: InventoryItemId.parse(newId()), name: name.data, quantity: quantity.data, origin: ItemOrigin.Import }
    : undefined;
}

/**
 * The inventory an import carries: every matched item with its runes, carry state and investment, every other line as
 * a custom item under Pathbuilder's name, and the coins. Nothing is dropped. A Pathbuilder container that is a core
 * container becomes that item, with the lines it held stowed inside; any other container drops its grouping, and its
 * lines stay loose.
 */
export function importedInventory(value: PathbuilderImport, content: InventoryContent): Inventory {
  const bags = containerLines(value, content);
  const containers = new Map([...bags].map(([key, bag]) => [key, bag.id]));
  const items: InventoryItem[] = [...bags.values()];
  const customItems: CustomItem[] = [];
  for (const imported of value.items) {
    const line = lineFor(imported, content, { items, containers });
    const custom = line === undefined ? customFor(imported) : undefined;
    if (line !== undefined) {
      items.push(investedAs(line, imported, content));
    } else if (custom !== undefined) {
      customItems.push(custom);
    }
  }
  const { platinum, gold, silver, copper } = value.coins;
  return InventorySchema.parse({
    items,
    customItems,
    coins: {
      [Coin.Platinum]: CoinAmount.parse(platinum),
      [Coin.Gold]: CoinAmount.parse(gold),
      [Coin.Silver]: CoinAmount.parse(silver),
      [Coin.Copper]: CoinAmount.parse(copper),
    },
  });
}
