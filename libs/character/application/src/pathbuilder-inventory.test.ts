import { describe, expect, test } from 'bun:test';

import { CarryState, CoinAmount, InventoryItemName, itemContent, ItemOrigin } from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import {
  entryLookup,
  ImportKind,
  PathbuilderContainerKey,
  PathbuilderName,
  readPathbuilderExport,
  registryLookup,
} from '@pioneer/interop/pathbuilder';
import type { ImportedContainer, ImportedItem, PathbuilderImport } from '@pioneer/interop/pathbuilder';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { ContentKind, ContentText } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { newId, Uuid } from '@pioneer/shared/kernel';

import { importedInventory } from './pathbuilder-inventory';

const GEAR = new ContentPackBuilder()
  .withId('gm-core')
  .withItem(ContentKind.Armor, 'full-plate', {
    bulk: 4,
    category: 'heavy',
    group: 'plate',
    acBonus: 6,
    dexCap: 0,
    checkPenalty: 3,
    speedPenalty: 10,
  })
  .withItem(ContentKind.Weapon, 'greataxe', {
    bulk: 2,
    category: 'martial',
    group: 'axe',
    damage: { dice: 1, die: 'd12', damageType: 'slashing' },
    usage: { type: 'held', hands: 'two' },
  })
  .withItem(ContentKind.Weapon, 'bastard-sword', {
    bulk: 1,
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  })
  .withMagicItem(ContentKind.Equipment, 'aerial-cloak', {
    data: { bulk: 'light', usage: { type: 'worn', slot: 'cloak' } },
    traits: ['invested', 'magical'],
  })
  .withItem(ContentKind.Equipment, 'torch', { bulk: 'light' })
  .withItem(ContentKind.Equipment, 'backpack', { bulk: 'negligible', container: { capacity: 4, ignored: 2 } })
  .withItem(ContentKind.Equipment, 'sack', { bulk: 'light', container: { capacity: 8 } })
  .withItem(ContentKind.Equipment, 'spacious-pouch-type-i', { bulk: 'light', container: { capacity: 25 } })
  .build();

/** Caliburn's property runes: seven, two more than an item holds. */
const CALIBURN_RUNES = [
  'Ghost Touch',
  'Bane',
  'Wounding',
  'Fearsome (Greater)',
  'Shockwave',
  'Disrupting (Greater)',
  'Keen',
];

/** What an import of `value` keeps, with `GEAR` and Caliburn's runes loaded, and how many of its lines `GEAR` matches. */
interface Imported {
  readonly inventory: Inventory;
  readonly matched: number;
}

async function importOf(value: PathbuilderImport): Promise<Imported> {
  const registry = await fixedContent(GEAR).registry();
  const lookup = registryLookup(registry);
  const runes = entryLookup({
    [ImportKind.Item]: CALIBURN_RUNES.map((name) => ({ id: Uuid.parse(newId()), name: ContentText.parse(name) })),
  });
  return {
    inventory: importedInventory(value, { items: lookup, runes, entries: itemContent(registry) }),
    matched: value.items.filter((each) => lookup.resolve(ImportKind.Item, each.name) !== undefined).length,
  };
}

function readExport(raw: unknown): PathbuilderImport {
  const read = readPathbuilderExport(raw);
  if (!read.ok) {
    throw new TypeError('The export does not read');
  }
  return read.value;
}

async function mordredInventory(): Promise<Inventory> {
  const { inventory } = await importOf(readExport(mordredExport));
  return inventory;
}

describe('importedInventory (Mordred)', () => {
  test('carries only the items the packs hold, never dropping a match', async () => {
    const { items } = await mordredInventory();
    expect(items).toHaveLength(7);
  });

  test('keeps every line the packs lack as a custom item under its own name, never dropping it', async () => {
    const value = readExport(mordredExport);
    const { inventory, matched } = await importOf(value);
    expect(inventory.items.length + inventory.customItems.length).toBe(value.items.length);
    expect(inventory.items).toHaveLength(matched);
    expect(inventory.customItems.length).toBeGreaterThan(0);
  });

  test('wears the worn armour with its runes, invested', async () => {
    const { items } = await mordredInventory();
    const plate = items.find((item) => item.carry.state === CarryState.Worn);
    expect(plate?.runes).toMatchObject({ potency: 2, resilient: 1 });
    expect(plate?.invested).toBe(true);
  });

  test('etches weapon potency and striking, and names the weapon the player named', async () => {
    const { items } = await mordredInventory();
    const named = items.filter((item) => item.name !== undefined).map((item) => item.name);
    expect(named).toStrictEqual([InventoryItemName.parse('Caliburn'), InventoryItemName.parse('Clarent')]);
    expect(items.find((item) => item.name === 'Clarent')?.runes).toMatchObject({ potency: 2, striking: 2 });
  });

  test("keeps all seven of Caliburn's property runes", async () => {
    const { items } = await mordredInventory();
    expect(items.find((item) => item.name === 'Caliburn')?.runes?.property).toHaveLength(CALIBURN_RUNES.length);
  });

  test('marks every line as imported', async () => {
    const { items } = await mordredInventory();
    expect(items.filter((item) => item.origin !== ItemOrigin.Import)).toStrictEqual([]);
  });

  test('invests only what content says is invested, and carries the coins', async () => {
    const { items, coins } = await mordredInventory();
    expect(items.filter((item) => item.invested === true)).toHaveLength(2);
    expect(coins).toStrictEqual({
      pp: CoinAmount.parse(0),
      gp: CoinAmount.parse(45),
      sp: CoinAmount.parse(6),
      cp: CoinAmount.parse(1),
    });
  });
});

describe('importedInventory (fixtures)', () => {
  test.each([
    ['Briar Rose', briarRoseExport],
    ['Mordred', mordredExport],
  ])('keeps every item of %s that the packs hold', async (_name, raw) => {
    const { inventory, matched } = await importOf(readExport(raw));
    expect(inventory.items).toHaveLength(matched);
  });
});

describe('importedInventory (over the limits)', () => {
  const cloak: ImportedItem = {
    name: PathbuilderName.parse('Aerial Cloak'),
    quantity: 1,
    displayName: undefined,
    worn: false,
    invested: true,
    runes: undefined,
    container: undefined,
  };
  const CLOAKS = 12;

  test('keeps every item Pathbuilder invests invested, past the limit', async () => {
    const value = { ...readExport(mordredExport), items: Array.from({ length: CLOAKS }, () => cloak) };
    const { inventory } = await importOf(value);
    expect(inventory.items.filter((item) => item.invested === true)).toHaveLength(CLOAKS);
  });
});

function container(
  key: PathbuilderContainerKey,
  name: string,
  flags: Partial<ImportedContainer> = {},
): ImportedContainer {
  return { key, name: PathbuilderName.parse(name), backpack: false, bagOfHolding: false, ...flags };
}

function torch(inside: PathbuilderContainerKey | undefined): ImportedItem {
  return {
    name: PathbuilderName.parse('Torch'),
    quantity: 1,
    displayName: undefined,
    worn: false,
    invested: false,
    runes: undefined,
    container: inside,
  };
}

async function withContainers(
  containers: readonly ImportedContainer[],
  items: readonly ImportedItem[],
): Promise<Inventory> {
  const { inventory } = await importOf({ ...readExport(mordredExport), containers, items });
  return inventory;
}

describe('importedInventory (containers)', () => {
  const PACK = PathbuilderContainerKey.parse('pack-key');
  const FOLDER = PathbuilderContainerKey.parse('folder-key');
  const POUCH = PathbuilderContainerKey.parse('pouch-key');

  test('a container that is a core container becomes that item with its lines stowed inside', async () => {
    const { items } = await withContainers([container(PACK, 'Backpack')], [torch(PACK), torch(PACK), torch(undefined)]);
    const [bag, ...lines] = items;
    expect(bag?.container).toBeUndefined();
    expect(bag?.carry.state).toBe(CarryState.Stowed);
    expect(bag?.origin).toBe(ItemOrigin.Import);
    expect(lines.map((line) => line.container)).toStrictEqual([bag?.id, bag?.id, undefined]);
  });

  test('a container with no match drops its grouping and none of its lines is lost', async () => {
    const { items, customItems } = await withContainers(
      [container(FOLDER, 'Plot Items')],
      [torch(FOLDER), torch(FOLDER)],
    );
    expect(items).toHaveLength(2);
    expect(items.map((line) => line.container)).toStrictEqual([undefined, undefined]);
    expect(customItems).toStrictEqual([]);
  });

  test('a folder named for a core item that holds nothing is not a container', async () => {
    const { items } = await withContainers([container(FOLDER, 'Torch')], [torch(FOLDER)]);
    expect(items).toHaveLength(1);
    expect(items[0]?.container).toBeUndefined();
  });

  test("Pathbuilder's backpack flag stands for a backpack whatever the folder is called", async () => {
    const { items } = await withContainers([container(PACK, 'My Stuff', { backpack: true })], [torch(PACK)]);
    expect(items).toHaveLength(2);
    expect(items[1]?.container).toBe(items[0]?.id);
  });

  test("Pathbuilder's bag of holding flag stands for the remaster's spacious pouch", async () => {
    const { items } = await withContainers([container(POUCH, 'Loot', { bagOfHolding: true })], [torch(POUCH)]);
    expect(items).toHaveLength(2);
    expect(items[1]?.container).toBe(items[0]?.id);
  });

  test('an empty core container is still imported', async () => {
    const { items } = await withContainers([container(PACK, 'Sack')], []);
    expect(items).toHaveLength(1);
  });

  test('a line naming a container the export lacks stays loose', async () => {
    const { items } = await withContainers([], [torch(PACK)]);
    expect(items.map((line) => line.container)).toStrictEqual([undefined]);
  });
});

describe('importedInventory (Mordred containers)', () => {
  test("drops Mordred's two folders, which are not core containers, and keeps every line", async () => {
    const value = readExport(mordredExport);
    const { inventory, matched } = await importOf(value);
    expect(value.containers).toHaveLength(2);
    expect(inventory.items).toHaveLength(matched);
    expect(inventory.items.filter((line) => line.container !== undefined)).toStrictEqual([]);
  });
});
