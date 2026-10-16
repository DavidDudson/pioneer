import { describe, expect, test } from 'bun:test';

import { CarryState, ItemOrigin, itemContent } from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import {
  entryLookup,
  ImportKind,
  PathbuilderName,
  readPathbuilderExport,
  registryLookup,
} from '@pioneer/interop/pathbuilder';
import type { ImportedItem, PathbuilderImport } from '@pioneer/interop/pathbuilder';
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

  test('wears the worn armour with its runes, invested', async () => {
    const { items } = await mordredInventory();
    const plate = items.find((item) => item.carry.state === CarryState.Worn);
    expect(plate?.runes).toMatchObject({ potency: 2, resilient: 1 });
    expect(plate?.invested).toBe(true);
  });

  test('etches weapon potency and striking, and names the weapon the player named', async () => {
    const { items } = await mordredInventory();
    const named = items.filter((item) => item.name !== undefined).map((item) => item.name);
    expect(named).toStrictEqual(['Caliburn', 'Clarent']);
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
    expect(coins).toStrictEqual({ pp: 0, gp: 45, sp: 6, cp: 1 });
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
  };
  const CLOAKS = 12;

  test('keeps every item Pathbuilder invests invested, past the limit', async () => {
    const value = { ...readExport(mordredExport), items: Array.from({ length: CLOAKS }, () => cloak) };
    const { inventory } = await importOf(value);
    expect(inventory.items.filter((item) => item.invested === true)).toHaveLength(CLOAKS);
  });
});
