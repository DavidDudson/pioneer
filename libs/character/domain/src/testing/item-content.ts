import {
  ContentId,
  contentId,
  ContentKind,
  ContentRegistry,
  EntrySlug,
  packContentsFromFiles,
  PackId,
} from '@pioneer/rules/sdk';
import type { ContentPack, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

import { itemContent } from '../inventory-content';
import type { ItemContent } from '../inventory-content';
import { runeContent } from '../item-runes';
import type { RuneContent } from '../item-runes';
import { CLUMSY, ENCUMBERED, ITEM_PACK } from './condition-fixture-ids';
import { BULWARK_CHARM, EMBER_BLADE, TROLL_CHARM } from './effect-items';
import { withUnderwater } from './environment-fixtures';
import { FIRE_STAFF, FIRE_STAFF_SPELLS, FIREBALL_WAND } from './fire-staff';
import { HUNTERS_BLADE } from './hunters-blade';
import { HUNTERS_CLOAK } from './hunters-cloak';
import { MOVEMENT_CHARM } from './movement-charm';
import { RuneFixture, RUNES } from './rune-fixtures';
import { ALCHEMISTS_FIRE, HOLY_WATER } from './thrown-items';
import { LEVEL_TONIC, UNREADABLE_TONIC } from './tonic-items';

/** Player Core numbers (Foundry pf2e) for the items the inventory tests carry. */
const BACKPACK_CAPACITY = 4;
const BACKPACK_IGNORED = 2;
const ARROWS_PER_BULK = 10;
/** Arrows are sold 10 to a batch: 1 sp for 10. */
const ARROWS_PER_BATCH = 10;
const BAG_OF_HOLDING_CAPACITY = 25;
const FLAME_TONGUE_LEVEL = 8;

/** The id of the fixture rune `name`. */
export function runeFixtureId(name: RuneFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`rune:${name}`)));
}

/** The items `ITEM_FIXTURES` holds, by name. */
export const ItemFixture = {
  Backpack: 'backpack',
  Rope: 'rope',
  Longsword: 'longsword',
  LeatherArmor: 'leather-armor',
  SteelShield: 'steel-shield',
  HealingPotion: 'healing-potion',
  /** A potion that heals 1d8, 10 and the drinker's level. */
  LevelTonic: 'level-tonic',
  /** A potion whose healing reads the value of an item, which no character has. */
  UnreadableTonic: 'unreadable-tonic',
  Diamond: 'diamond',
  Greatsword: 'greatsword',
  HideArmor: 'hide-armor',
  /** A worn cloak with the invested trait that gives +1 item to Perception. */
  Cloak: 'cloak',
  HuntersCloak: 'hunters-cloak',
  /** A held sword whose Strikes gain +2 against undead. */
  HuntersBlade: 'hunters-blade',
  /** Specific magic armour with the invested trait: its bonus to AC needs no investing, its rules do. */
  RuneArmor: 'rune-armor',
  /** Ammunition, light per 10. */
  Arrows: 'arrows',
  /** An extradimensional container that ignores all it holds up to its capacity. */
  BagOfHolding: 'bag-of-holding',
  /** Two Bulk of gear with no usage, to load a character up. */
  Anvil: 'anvil',
  /** A weapon whose name is exactly as long as a source slug may be, 64 characters. */
  LongSword: 'sword-of-the-very-long-name-that-just-fits-in-a-source-slug-ok64',
  /** A ranged weapon, which a melee-only rune doesn't go on. */
  Shortbow: 'shortbow',
  /** A thrown bomb in a stack: 1d8 fire, 1 persistent fire and 1 splash, range increment 20 feet. */
  AlchemistsFire: 'alchemists-fire',
  /** Holy water, a thrown consumable of 1d6 spirit with 1 splash. */
  HolyWater: 'holy-water',
  /** A specific magic weapon at level 8: +1 striking, with the flaming rune printed on it. */
  FlameTongue: 'flame-tongue',
  /** Worn boots with an activation once per hour, to count its uses. */
  WingedBoots: 'winged-boots',
  /** A worn invested charm that gives fast healing 2, 4 temporary Hit Points and one size larger. */
  TrollCharm: 'troll-charm',
  /** A held sword whose Strikes add 1d6 fire precision damage and a note on a critical success. */
  EmberBlade: 'ember-blade',
  MovementCharm: 'movement-charm',
  /** A worn invested charm whose alterations add to a shield's Hardness and give weapons cold iron, agile and flaming. */
  BulwarkCharm: 'bulwark-charm',
  /** A magic staff: Ignition, Breathe Fire at 1st rank, Floating Flame and Fireball at 3rd. */
  FireStaff: 'fire-staff',
  /** A wand of Fireball: cast once a day at 3rd rank, kept when spent. */
  FireballWand: 'fireball-wand',
} as const;
export type ItemFixture = (typeof ItemFixture)[keyof typeof ItemFixture];

/** A fixture item: its kind and data, and any traits and rule elements. */
interface ItemFixtureFields extends MagicItemFields {
  readonly kind: ContentKind;
}

const ITEMS: Readonly<Record<ItemFixture, ItemFixtureFields>> = {
  [ItemFixture.FireStaff]: FIRE_STAFF,
  [ItemFixture.FireballWand]: FIREBALL_WAND,
  [ItemFixture.Backpack]: {
    kind: ContentKind.Equipment,
    data: {
      bulk: 'negligible',
      usage: { type: 'worn', slot: 'backpack' },
      container: { capacity: BACKPACK_CAPACITY, ignored: BACKPACK_IGNORED, heldBulk: 'light' },
    },
  },
  [ItemFixture.Rope]: { kind: ContentKind.Equipment, data: { bulk: 'light', price: { coins: { sp: 5 } } } },
  [ItemFixture.Arrows]: {
    kind: ContentKind.Consumable,
    data: {
      bulk: 'light',
      bulkPer: ARROWS_PER_BULK,
      price: { coins: { sp: 1 }, per: ARROWS_PER_BATCH },
      category: 'ammunition',
    },
  },
  [ItemFixture.BagOfHolding]: {
    kind: ContentKind.Equipment,
    data: {
      bulk: 1,
      usage: { type: 'held', hands: 'one' },
      container: { capacity: BAG_OF_HOLDING_CAPACITY, ignored: BAG_OF_HOLDING_CAPACITY },
    },
    traits: ['extradimensional', 'magical'],
  },
  [ItemFixture.Anvil]: { kind: ContentKind.Equipment, data: { bulk: 2 } },
  [ItemFixture.AlchemistsFire]: ALCHEMISTS_FIRE,
  [ItemFixture.HolyWater]: HOLY_WATER,
  [ItemFixture.Longsword]: {
    kind: ContentKind.Weapon,
    data: {
      baseItem: 'longsword',
      bulk: 1,
      price: { coins: { gp: 1 } },
      category: 'martial',
      group: 'sword',
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      usage: { type: 'held', hands: 'one' },
    },
  },
  [ItemFixture.LeatherArmor]: {
    kind: ContentKind.Armor,
    data: { bulk: 1, category: 'light', group: 'leather', acBonus: 1, dexCap: 4, checkPenalty: 1 },
  },
  [ItemFixture.SteelShield]: { kind: ContentKind.Shield, data: { bulk: 1, acBonus: 2, hardness: 5, hitPoints: 20 } },
  [ItemFixture.HealingPotion]: {
    kind: ContentKind.Consumable,
    data: {
      bulk: 'light',
      category: 'potion',
      usage: { type: 'held', hands: 'one' },
      damage: { formula: '1d8', kind: 'healing' },
    },
  },
  [ItemFixture.LevelTonic]: LEVEL_TONIC,
  [ItemFixture.UnreadableTonic]: UNREADABLE_TONIC,
  [ItemFixture.Diamond]: { kind: ContentKind.Treasure, data: { bulk: 'negligible', category: 'gem' } },
  [ItemFixture.Greatsword]: {
    kind: ContentKind.Weapon,
    data: {
      bulk: 2,
      category: 'martial',
      group: 'sword',
      damage: { dice: 1, die: 'd12', damageType: 'slashing' },
      usage: { type: 'held', hands: 'two' },
    },
  },
  [ItemFixture.HideArmor]: {
    kind: ContentKind.Armor,
    data: { bulk: 2, category: 'medium', group: 'leather', acBonus: 3, dexCap: 2, checkPenalty: 2, speedPenalty: 5 },
  },
  [ItemFixture.Cloak]: {
    kind: ContentKind.Equipment,
    data: { bulk: 'light', usage: { type: 'worn', slot: 'cloak' } },
    traits: ['invested', 'magical'],
    rules: [{ key: 'FlatModifier', selectors: ['perception'], type: 'item', value: 1 }],
  },
  [ItemFixture.HuntersCloak]: HUNTERS_CLOAK,
  [ItemFixture.HuntersBlade]: HUNTERS_BLADE,
  [ItemFixture.LongSword]: {
    kind: ContentKind.Weapon,
    data: {
      bulk: 1,
      category: 'martial',
      group: 'sword',
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      usage: { type: 'held', hands: 'one' },
    },
  },
  [ItemFixture.Shortbow]: {
    kind: ContentKind.Weapon,
    data: {
      bulk: 1,
      category: 'martial',
      group: 'bow',
      damage: { dice: 1, die: 'd6', damageType: 'piercing' },
      range: 60,
      usage: { type: 'held', hands: 'one-plus' },
    },
  },
  [ItemFixture.FlameTongue]: {
    kind: ContentKind.Weapon,
    level: FLAME_TONGUE_LEVEL,
    data: {
      bulk: 1,
      category: 'martial',
      group: 'sword',
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      usage: { type: 'held', hands: 'one' },
      runes: { potency: 1, striking: 1, property: [runeFixtureId(RuneFixture.Flaming)] },
    },
    traits: ['magical'],
  },
  [ItemFixture.WingedBoots]: {
    kind: ContentKind.Equipment,
    data: {
      bulk: 'light',
      usage: { type: 'worn', slot: 'boots' },
      activations: [
        { slug: 'take-to-the-skies', name: 'Take to the Skies', frequency: { max: 1, per: 'hour' }, cost: 'two' },
      ],
    },
    traits: ['magical'],
  },
  [ItemFixture.EmberBlade]: EMBER_BLADE,
  [ItemFixture.BulwarkCharm]: BULWARK_CHARM,
  [ItemFixture.TrollCharm]: TROLL_CHARM,
  [ItemFixture.MovementCharm]: MOVEMENT_CHARM,
  [ItemFixture.RuneArmor]: {
    kind: ContentKind.Armor,
    data: { bulk: 1, category: 'light', group: 'leather', acBonus: 2, dexCap: 3 },
    traits: ['invested', 'magical'],
    rules: [{ key: 'FlatModifier', selectors: ['fortitude'], type: 'item', value: 1 }],
  },
};

/** One item of every carried kind, runes to etch onto them, the encumbered condition and the underwater environment. */
function itemPack(): ContentPack {
  const builder = new ContentPackBuilder().withId(ITEM_PACK);
  for (const [name, fields] of Object.entries(ITEMS)) {
    builder.withMagicItem(fields.kind, name, fields);
  }
  for (const [name, fields] of Object.entries(RUNES)) {
    builder.withMagicItem(ContentKind.Rune, name, fields);
  }
  for (const [name, spell] of Object.entries(FIRE_STAFF_SPELLS)) {
    builder.withSpell(name, spell);
  }
  builder.withCondition(
    CLUMSY,
    [{ key: 'FlatModifier', selectors: ['dex-based'], type: 'status', slug: CLUMSY, value: '-@item.value' }],
    { valued: true },
  );
  builder.withCondition(ENCUMBERED, [
    { key: 'FlatModifier', selectors: ['all-speeds'], type: 'untyped', slug: ENCUMBERED, value: -10 },
    { key: 'GrantItem', item: builder.idOf(ContentKind.Condition, CLUMSY) },
  ]);
  return withUnderwater(builder).build();
}

export const ITEM_FIXTURES: ContentPack = itemPack();

/** The id of the fixture item `name`. */
export function itemFixtureId(name: ItemFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`${ITEMS[name].kind}:${name}`)));
}

/** A registry holding `ITEM_FIXTURES`. */
export function itemFixtureRegistry(): ContentRegistry {
  const registry = new ContentRegistry();
  registry.register(ITEM_FIXTURES);
  return registry;
}

/** `ITEM_FIXTURES` as the inventory reads it. */
export function itemFixtureContent(): ItemContent {
  return itemContent(itemFixtureRegistry());
}

/** The runes in `ITEM_FIXTURES`, as rune edits read them. */
export function runeFixtureContent(): RuneContent {
  return runeContent(itemFixtureRegistry());
}

/** `ITEM_FIXTURES` as content files, for the browser's content bundles in tests. */
export const ITEM_FIXTURE_FILES: PackContentsLoader = {
  id: PackId.parse(ITEM_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles({ id: ITEM_PACK, title: 'Item fixtures', publisher: 'Pioneer tests', license: 'homebrew' }, [
      ITEM_FIXTURES.otherEntries,
    ]),
};
