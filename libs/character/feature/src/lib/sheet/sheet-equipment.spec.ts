import { TestBed } from '@angular/core/testing';
import {
  addItem,
  Character,
  carryItem,
  CarryState,
  EMPTY_INVENTORY,
  InventoryItemId,
  investItem,
  itemContent,
  ItemQuantity,
} from '@pioneer/character/domain';
import type { Carry, Inventory } from '@pioneer/character/domain';
import { CharacterBuilder, ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { LineStatusKind } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { carriesEquipment, EQUIPMENT_CONTENT_KINDS, sheetInvestments } from './sheet-equipment';
import { sheetStatistics } from './sheet-statistics';

const one = ItemQuantity.parse(1);
const ARMOR = InventoryItemId.parse('44444444-4444-4444-8444-444444444444');
const CLOAK = InventoryItemId.parse('77777777-7777-4777-8777-777777777777');
const WORN: Carry = { state: CarryState.Worn };

function wearing(...items: readonly (readonly [InventoryItemId, ItemFixture])[]): Inventory {
  let stock = EMPTY_INVENTORY;
  for (const [id, name] of items) {
    stock = carryItem(addItem(stock, { id, item: itemFixtureId(name), quantity: one, container: undefined }), id, WORN);
  }
  return stock;
}

function carrying(inventory: Inventory): Character {
  const built = new CharacterBuilder().build();
  return new Character({
    document: { ...built.document, inventory },
    version: built.version,
    createdAt: built.createdAt,
    updatedAt: built.updatedAt,
  });
}

async function equipmentRegistry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([ITEM_FIXTURE_FILES]) });
  return TestBed.inject(ContentLoader).registry(EQUIPMENT_CONTENT_KINDS);
}

/** The value of the statistic called `name`: its total and lines. Throws when it failed or is missing. */
function valueOf(statistics: readonly NamedStatistic[], name: string): StatisticValue {
  const result = statistics.find((each) => each.name === name)?.result;
  if (result?.ok !== true) {
    throw new Error(`No value for ${name}`);
  }
  return result;
}

/** `character` with `change` made to its inventory. */
function changed(character: Character, change: (inventory: Inventory) => Inventory): Character {
  return carrying(change(character.document.inventory));
}

describe(carriesEquipment, () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('is true once anything is worn, held or invested', () => {
    const armored = carrying(wearing([ARMOR, ItemFixture.LeatherArmor]));
    expect(carriesEquipment(armored)).toBe(true);
    const stowed = addItem(EMPTY_INVENTORY, {
      id: ARMOR,
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
    expect(carriesEquipment(carrying(stowed))).toBe(false);
    const invested = investItem(stowed, ARMOR, true);
    expect(carriesEquipment(carrying(invested))).toBe(true);
    expect(carriesEquipment(undefined)).toBe(false);
  });
});

describe(sheetStatistics, () => {
  it('adds worn armour to AC and an invested cloak to Perception, each named by its item', async () => {
    const registry = await equipmentRegistry();
    const kitted = carrying(wearing([ARMOR, ItemFixture.LeatherArmor], [CLOAK, ItemFixture.Cloak]));
    const valeros = changed(kitted, (inventory) => investItem(inventory, CLOAK, true));
    const statistics = sheetStatistics(registry, valeros);
    const unarmoured = sheetStatistics(registry, carrying(EMPTY_INVENTORY));
    expect(valueOf(statistics, 'Armor Class').total - valueOf(unarmoured, 'Armor Class').total).toBe(1);
    const { lines } = valueOf(statistics, 'Perception');
    expect(lines.map(({ value, status }) => [value, status.kind])).toStrictEqual([[1, LineStatusKind.Applied]]);
  });
});

describe(sheetInvestments, () => {
  it('lists each invested item with whether it works and the lines it adds', async () => {
    const registry = await equipmentRegistry();
    const worn = changed(carrying(wearing([CLOAK, ItemFixture.Cloak])), (inventory) =>
      investItem(inventory, CLOAK, true),
    );
    const [cloak] = sheetInvestments(worn, itemContent(registry), sheetStatistics(registry, worn));
    expect(cloak).toMatchObject({ id: CLOAK, name: 'Cloak', working: true });
    expect(cloak?.effects.map(({ statistic }) => statistic)).toStrictEqual(['Perception']);
  });

  it('says an invested item taken off does nothing', async () => {
    const registry = await equipmentRegistry();
    const stowed = carryItem(wearing([CLOAK, ItemFixture.Cloak]), CLOAK, { state: CarryState.Stowed });
    const off = carrying(investItem(stowed, CLOAK, true));
    expect(sheetInvestments(off, itemContent(registry), sheetStatistics(registry, off))).toMatchObject([
      { id: CLOAK, working: false, effects: [] },
    ]);
  });
});
