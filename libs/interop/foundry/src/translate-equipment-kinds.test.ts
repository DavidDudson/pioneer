import { describe, expect, test } from 'bun:test';

import { ContentEntry, ContentKind, KIND_DATA } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { dataIn, entryOfKind, gapKeys } from './testing/build-helpers';
import {
  BACKPACK,
  EQUIPMENT,
  FLAMING_LONGSWORD,
  LONGSWORD,
  physical,
  STEEL_SHIELD,
  weapon,
} from './testing/equipment-fixtures';
import { idOf, translate } from './testing/import-fixtures';
import { contentEntry, gapsOf } from './testing/kind-fixtures';

const translation = translate(EQUIPMENT);

describe('translateKindData: one fixture per equipment kind, translated and parsed', () => {
  test.each([
    ['longsword', ContentKind.Weapon],
    ['full-plate', ContentKind.Armor],
    ['steel-shield', ContentKind.Shield],
    ['cloak-of-elvenkind', ContentKind.Equipment],
    ['backpack', ContentKind.Equipment],
    ['healing-potion-minor', ContentKind.Consumable],
    ['arrows', ContentKind.Consumable],
    ['gold-pieces', ContentKind.Treasure],
    ['flaming', ContentKind.Rune],
  ] as const)('%s parses against its kind data and as a ContentEntry', (name, kind) => {
    const entry = entryOfKind(translation, kind, name);

    expect(KIND_DATA[kind].safeParse(entry?.kindData?.data).success).toBe(true);
    expect(ContentEntry.safeParse(contentEntry(entry)).error).toBeUndefined();
  });

  test('the fixtures leave nothing unmapped', () => {
    expect(gapKeys(translation)).toEqual([]);
  });
});

describe('translateKindData: weapons', () => {
  test('category, group, base weapon, damage, price, Bulk and usage map', () => {
    expect(dataIn(translation, 'longsword')).toEqual({
      price: { coins: { gp: 1 } },
      bulk: 1,
      category: 'martial',
      group: 'sword',
      baseItem: 'longsword',
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      usage: { type: 'held', hands: 'one' },
    });
  });

  test('a ranged weapon has its range increment, reload and ammunition', () => {
    expect(dataIn(translation, 'longbow')).toMatchObject({
      range: 100,
      reload: 0,
      ammunition: { type: 'arrows' },
      usage: { type: 'held', hands: 'one-plus' },
    });
  });

  test('a bomb has persistent and splash damage, its attack bonus, and light Bulk', () => {
    expect(dataIn(translation, 'alchemists-fire-moderate')).toMatchObject({
      bulk: 'light',
      damage: { dice: 2, die: 'd8', damageType: 'fire', persistent: { formula: '2', damageType: 'fire' } },
      splash: 2,
      itemBonus: 1,
    });
  });

  test("a specific weapon's runes and material map, its potency not repeated as an item bonus", () => {
    const data = dataIn(translation, 'searing-longsword');

    expect(data).toMatchObject({
      material: { type: 'cold-iron', grade: 'standard' },
      runes: { potency: 1, striking: 1, property: [idOf('rune:flaming'), idOf('rune:frost-greater')] },
    });
    expect(data).not.toHaveProperty('itemBonus');
  });

  test('a property rune with no entry is reported and left off', () => {
    const lone = translate([FLAMING_LONGSWORD]);

    expect(dataIn(lone, 'searing-longsword')).toMatchObject({ runes: { property: [] } });
    expect(gapKeys(lone)).toEqual([
      `${KindDataGapReason.UnresolvedReference} runes.property`,
      `${KindDataGapReason.UnresolvedReference} runes.property`,
    ]);
  });

  test('a flat damage die, an unknown reload and bonus damage are mapped or reported', () => {
    const blowgun = weapon('bL0wGuN000000001', 'Blowgun', {
      ...LONGSWORD.system,
      damage: { damageType: 'piercing', dice: 1, die: '' },
      reload: { value: 'varies' },
      bonusDamage: { value: 2 },
    });
    const lone = translate([blowgun]);

    expect(dataIn(lone, 'blowgun')).toMatchObject({ damage: { dice: 1, damageType: 'piercing' } });
    expect(gapKeys(lone)).toEqual([
      `${KindDataGapReason.UnmappedField} bonusDamage`,
      `${KindDataGapReason.UnmappedValue} reload.value`,
    ]);
  });
});

describe('translateKindData: armour and shields', () => {
  test('penalties are their size, and a Dexterity cap of 0 is kept', () => {
    expect(dataIn(translation, 'full-plate')).toEqual({
      price: { coins: { gp: 30 } },
      bulk: 4,
      category: 'heavy',
      acBonus: 6,
      group: 'plate',
      baseItem: 'full-plate',
      dexCap: 0,
      checkPenalty: 3,
      speedPenalty: 10,
      strength: 4,
    });
  });

  test("a shield's hardness and Hit Points, and a reinforcing rune", () => {
    const sturdy = physical(
      { id: 'sTuRdYsHiElD0001', name: 'Sturdy Shield (Minor)', type: 'shield' },
      {
        ...STEEL_SHIELD.system,
        hardness: 8,
        hp: { max: 64, value: 64 },
        runes: { reinforcing: 1 },
      },
    );

    expect(dataIn(translation, 'steel-shield')).toEqual({
      price: { coins: { gp: 2 } },
      bulk: 1,
      hardness: 5,
      hitPoints: 20,
      acBonus: 2,
      baseItem: 'steel-shield',
    });
    expect(dataIn(translate([sturdy]), 'sturdy-shield-minor')).toMatchObject({ runes: { reinforcing: 1 } });
  });

  test('a shield with no Hit Points has no data', () => {
    const broken = physical(
      { id: 'bRoKeNsHiElD0001', name: 'Broken Shield', type: 'shield' },
      { ...STEEL_SHIELD.system, hp: { max: 0 } },
    );
    const lone = translate([broken]);

    expect(dataIn(lone, 'broken-shield')).toBeUndefined();
    expect(gapKeys(lone)).toEqual([`${KindDataGapReason.InvalidData} hitPoints`]);
  });
});

describe('translateKindData: equipment and treasure', () => {
  test('a backpack is equipment with a container, its held Bulk apart from its worn', () => {
    expect(dataIn(translation, 'backpack')).toEqual({
      price: { coins: { sp: 1 } },
      bulk: 'negligible',
      usage: { type: 'worn', slot: 'backpack' },
      container: { capacity: 4, ignored: 2, heldBulk: 'light' },
    });
  });

  test("a container whose contents aren't stowed, or that holds nothing, is reported", () => {
    const sack = physical(
      { id: 'sAcK000000000001', name: 'Sack', type: 'backpack' },
      {
        ...BACKPACK.system,
        bulk: { capacity: 0, heldOrStowed: 0, ignored: 0, value: 0 },
        stowing: false,
      },
    );
    const lone = translate([sack]);

    expect(dataIn(lone, 'sack')).not.toHaveProperty('container');
    expect(gapKeys(lone)).toEqual([
      `${KindDataGapReason.UnmappedValue} stowing`,
      `${KindDataGapReason.UnmappedValue} bulk.capacity`,
    ]);
  });

  test('worn slots and apex attributes', () => {
    expect(dataIn(translation, 'cloak-of-elvenkind')).toMatchObject({ usage: { type: 'worn', slot: 'cloak' } });
    expect(dataIn(translation, 'headband-of-inspired-wisdom')).toMatchObject({ apex: 'wis', bulk: 'negligible' });
  });

  test('coins have their category and the stack their Bulk is for', () => {
    expect(dataIn(translation, 'gold-pieces')).toEqual({
      price: { coins: { gp: 1 } },
      bulk: 1,
      bulkPer: 1000,
      category: 'coin',
    });
  });

  test('a usage Pioneer cannot split and a size other than medium are reported or mapped', () => {
    const mirror = physical(
      { id: 'mIrRoR0000000001', name: 'Mirror', type: 'equipment' },
      { usage: { value: 'bonded' }, size: 'lg' },
    );
    const lone = translate([mirror]);

    expect(dataIn(lone, 'mirror')).toEqual({ bulk: 'negligible', size: 'large' });
    expect(gapKeys(lone)).toEqual([`${KindDataGapReason.UnmappedValue} usage`]);
  });

  test('Bulk that is neither light nor whole leaves the item without data', () => {
    const odd = physical({ id: 'oDdBuLk000000001', name: 'Odd', type: 'equipment' }, { bulk: { value: 0.5 } });

    expect(gapsOf(translate([odd]))).toEqual([
      { reason: KindDataGapReason.UnmappedValue, field: 'bulk.value', raw: 0.5 },
    ]);
  });
});
