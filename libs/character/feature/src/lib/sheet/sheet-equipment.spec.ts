import { TestBed } from '@angular/core/testing';
import {
  addItem,
  Character,
  carryItem,
  CarryState,
  CoinsSchema,
  ConditionInstanceId,
  EMPTY_INVENTORY,
  InventoryItemId,
  investItem,
  itemContent,
  ItemQuantity,
  UNLIMITED,
  withPlay,
} from '@pioneer/character/domain';
import type { ActiveCondition, Carry, Inventory } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  clumsyFixtureId,
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
} from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { LineStatusKind } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import { ConditionValue, OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { carriesAnything, EQUIPMENT_CONTENT_KINDS, readsEquipment, sheetInvestments } from './sheet-equipment';
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

/** A character with `gold` gold pieces and nothing else. */
function withGold(gold: number): Character {
  return carrying({ ...EMPTY_INVENTORY, coins: CoinsSchema.parse({ gp: gold }) });
}

const FIRST_INSTANCE = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000001');
const SECOND_INSTANCE = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000002');

/** Clumsy at `value`, as the `id` instance of it. */
function clumsy(value: number, id = FIRST_INSTANCE): ActiveCondition {
  return { id, condition: clumsyFixtureId(), value: ConditionValue.parse(value), duration: UNLIMITED };
}

/** The value of the statistic called `name` for `character`. */
function statisticOf(registry: ContentRegistry, character: Character, name: string): StatisticValue {
  return valueOf(sheetStatistics(registry, character), name);
}

/** `character` with exactly `conditions` active. */
function afflicted(character: Character, conditions: readonly ActiveCondition[]): Character {
  return withPlay(character, { ...character.document.play, conditions: [...conditions] });
}

/** A character carrying `count` anvils, 2 Bulk each. */
function anvils(count: number): Character {
  const item = itemFixtureId(ItemFixture.Anvil);
  return carrying(
    addItem(EMPTY_INVENTORY, { id: ARMOR, item, quantity: ItemQuantity.parse(count), container: undefined }),
  );
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

describe(carriesAnything, () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('is true once anything is carried, or coins enough to weigh 1 Bulk', () => {
    const rope = addItem(EMPTY_INVENTORY, {
      id: ARMOR,
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
    expect(carriesAnything(carrying(rope))).toBe(true);
    expect(carriesAnything(carrying(EMPTY_INVENTORY))).toBe(false);
    expect(carriesAnything(withGold(999))).toBe(false);
    expect(carriesAnything(withGold(1000))).toBe(true);
    expect(carriesAnything(undefined)).toBe(false);
  });
});

describe(readsEquipment, () => {
  it('is true once a condition is active, though nothing is carried', () => {
    const clumsyCharacter = afflicted(carrying(EMPTY_INVENTORY), [clumsy(1)]);
    expect(readsEquipment(carrying(EMPTY_INVENTORY))).toBe(false);
    expect(readsEquipment(clumsyCharacter)).toBe(true);
  });
});

describe(sheetStatistics, () => {
  it('lists the class DC after Perception', async () => {
    const registry = await equipmentRegistry();
    const names = sheetStatistics(registry, carrying(EMPTY_INVENTORY)).map(({ name }) => name);
    expect(names.slice(-3)).toStrictEqual(['Perception', 'Class DC', 'Speed']);
  });

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

  it('applies the encumbered condition while the character carries more than 5 plus its Strength in Bulk', async () => {
    const registry = await equipmentRegistry();
    const unburdened = valueOf(sheetStatistics(registry, anvils(2)), 'Armor Class').total;
    const encumbered = valueOf(sheetStatistics(registry, anvils(3)), 'Armor Class');
    expect(encumbered.total).toBe(unburdened - 1);
    expect(encumbered.lines.map(({ modifier }) => modifier.origin.hops[0]?.kind)).toContain(OriginHopKind.Condition);
  });

  it.each(['Armor Class', 'Reflex'])(
    "gives %s, a Dexterity-based statistic, Clumsy 1's −1 through the clumsy encumbered grants",
    async (name) => {
      const registry = await equipmentRegistry();
      const unburdened = valueOf(sheetStatistics(registry, anvils(2)), name);
      const encumbered = valueOf(sheetStatistics(registry, anvils(3)), name);
      expect(encumbered.total).toBe(unburdened.total - 1);
      expect(encumbered.lines.map(({ modifier }) => modifier.origin.entry)).toStrictEqual([clumsyFixtureId()]);
    },
  );

  it('leaves Fortitude, which is not Dexterity-based, as it is while encumbered', async () => {
    const registry = await equipmentRegistry();
    const unburdened = valueOf(sheetStatistics(registry, anvils(2)), 'Fortitude');
    const encumbered = valueOf(sheetStatistics(registry, anvils(3)), 'Fortitude');
    expect(encumbered.total).toBe(unburdened.total);
  });
});

describe('conditions in play', () => {
  it.each(['Armor Class', 'Reflex'])(
    "lower %s, a Dexterity-based statistic, by the condition's value, naming the condition",
    async (name) => {
      const registry = await equipmentRegistry();
      const well = statisticOf(registry, carrying(EMPTY_INVENTORY), name);
      const ill = afflicted(carrying(EMPTY_INVENTORY), [clumsy(2)]);
      const sick = statisticOf(registry, ill, name);
      expect(sick.total).toBe(well.total - 2);
      const hops = sick.lines.map(({ modifier }) => modifier.origin.hops[0]);
      expect(hops).toMatchObject([{ kind: OriginHopKind.Condition, condition: clumsyFixtureId(), value: 2 }]);
    },
  );

  it('count a condition once however many instances, at its highest value', async () => {
    const registry = await equipmentRegistry();
    const well = statisticOf(registry, carrying(EMPTY_INVENTORY), 'Armor Class');
    const twice = afflicted(carrying(EMPTY_INVENTORY), [clumsy(1), clumsy(3, SECOND_INSTANCE)]);
    expect(statisticOf(registry, twice, 'Armor Class').total).toBe(well.total - 3);
  });

  it('end with the instance, restoring the statistic', async () => {
    const registry = await equipmentRegistry();
    const well = statisticOf(registry, carrying(EMPTY_INVENTORY), 'Armor Class');
    const cured = afflicted(afflicted(carrying(EMPTY_INVENTORY), [clumsy(2)]), []);
    expect(statisticOf(registry, cured, 'Armor Class').total).toBe(well.total);
  });
});

describe(sheetInvestments, () => {
  it('lists each invested item with whether it works and the lines it adds', async () => {
    const registry = await equipmentRegistry();
    const worn = changed(carrying(wearing([CLOAK, ItemFixture.Cloak])), (inventory) =>
      investItem(inventory, CLOAK, true),
    );
    const [cloak] = sheetInvestments(worn, itemContent(registry), { statistics: sheetStatistics(registry, worn) });
    expect(cloak).toMatchObject({ id: CLOAK, name: 'Cloak', working: true });
    expect(cloak?.effects.map(({ statistic }) => statistic)).toStrictEqual(['Perception']);
  });

  it('melds an invested item that works in a form, and not one that is off', async () => {
    const registry = await equipmentRegistry();
    const worn = changed(carrying(wearing([CLOAK, ItemFixture.Cloak])), (inventory) =>
      investItem(inventory, CLOAK, true),
    );
    const content = itemContent(registry);
    const statistics = sheetStatistics(registry, worn);
    expect(sheetInvestments(worn, content, { statistics, melded: true })).toMatchObject([{ id: CLOAK, melded: true }]);
    expect(sheetInvestments(worn, content, { statistics })).toMatchObject([{ id: CLOAK, melded: false }]);
    const stowed = carryItem(wearing([CLOAK, ItemFixture.Cloak]), CLOAK, { state: CarryState.Stowed });
    const off = carrying(investItem(stowed, CLOAK, true));
    const offStatistics = sheetStatistics(registry, off);
    expect(sheetInvestments(off, content, { statistics: offStatistics, melded: true })).toMatchObject([
      { melded: false },
    ]);
  });

  it('says an invested item taken off does nothing', async () => {
    const registry = await equipmentRegistry();
    const stowed = carryItem(wearing([CLOAK, ItemFixture.Cloak]), CLOAK, { state: CarryState.Stowed });
    const off = carrying(investItem(stowed, CLOAK, true));
    expect(sheetInvestments(off, itemContent(registry), { statistics: sheetStatistics(registry, off) })).toMatchObject([
      { id: CLOAK, working: false, effects: [] },
    ]);
  });
});
