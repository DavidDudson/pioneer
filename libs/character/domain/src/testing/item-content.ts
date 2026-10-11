import {
  contentId,
  ContentId,
  ContentKind,
  ContentRegistry,
  EntrySlug,
  PackId,
  packContentsFromFiles,
} from '@pioneer/rules/sdk';
import type { ContentPack, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

import { itemContent } from '../inventory-content';
import type { ItemContent } from '../inventory-content';

const ITEM_PACK = 'item-fixtures';

/**
 * The encumbered condition and the clumsy it grants, as Player Core has them: Clumsy 1's status penalty reaches AC and
 * the other Dexterity-based statistics, so the sheet shows it.
 */
const ENCUMBERED = 'encumbered';
const CLUMSY = 'clumsy';

/** Player Core numbers (Foundry pf2e) for the items the inventory tests carry. */
const BACKPACK_CAPACITY = 4;
const BACKPACK_IGNORED = 2;
const ARROWS_PER_BULK = 10;
const BAG_OF_HOLDING_CAPACITY = 25;

/** The items `ITEM_FIXTURES` holds, by name. */
export const ItemFixture = {
  Backpack: 'backpack',
  Rope: 'rope',
  Longsword: 'longsword',
  LeatherArmor: 'leather-armor',
  SteelShield: 'steel-shield',
  HealingPotion: 'healing-potion',
  Diamond: 'diamond',
  Greatsword: 'greatsword',
  HideArmor: 'hide-armor',
  /** A worn cloak with the invested trait that gives +1 item to Perception. */
  Cloak: 'cloak',
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
} as const;
export type ItemFixture = (typeof ItemFixture)[keyof typeof ItemFixture];

/** A fixture item: its kind and data, and any traits and rule elements. */
interface ItemFixtureFields extends MagicItemFields {
  readonly kind: ContentKind;
}

const ITEMS: Readonly<Record<ItemFixture, ItemFixtureFields>> = {
  [ItemFixture.Backpack]: {
    kind: ContentKind.Equipment,
    data: {
      bulk: 'negligible',
      usage: { type: 'worn', slot: 'backpack' },
      container: { capacity: BACKPACK_CAPACITY, ignored: BACKPACK_IGNORED, heldBulk: 'light' },
    },
  },
  [ItemFixture.Rope]: { kind: ContentKind.Equipment, data: { bulk: 'light' } },
  [ItemFixture.Arrows]: {
    kind: ContentKind.Consumable,
    data: { bulk: 'light', bulkPer: ARROWS_PER_BULK, category: 'ammunition' },
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
  [ItemFixture.Longsword]: {
    kind: ContentKind.Weapon,
    data: {
      bulk: 1,
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
    data: { bulk: 'light', category: 'potion', usage: { type: 'held', hands: 'one' } },
  },
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
  [ItemFixture.RuneArmor]: {
    kind: ContentKind.Armor,
    data: { bulk: 1, category: 'light', group: 'leather', acBonus: 2, dexCap: 3 },
    traits: ['invested', 'magical'],
    rules: [{ key: 'FlatModifier', selectors: ['fortitude'], type: 'item', value: 1 }],
  },
};

/** A pack of one item of every carried kind, a backpack among them to stow things in, and the encumbered condition. */
function itemPack(): ContentPack {
  const builder = new ContentPackBuilder().withId(ITEM_PACK);
  for (const [name, fields] of Object.entries(ITEMS)) {
    builder.withMagicItem(fields.kind, name, fields);
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
  return builder.build();
}

export const ITEM_FIXTURES: ContentPack = itemPack();

/** The id of the fixture item `name`. */
export function itemFixtureId(name: ItemFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`${ITEMS[name].kind}:${name}`)));
}

/** The id of the fixture encumbered condition. */
export function encumberedFixtureId(): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`condition:${ENCUMBERED}`)));
}

/** The id of the fixture clumsy condition, which encumbered grants. */
export function clumsyFixtureId(): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`condition:${CLUMSY}`)));
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

/** `ITEM_FIXTURES` as content files, for the browser's content bundles in tests. */
export const ITEM_FIXTURE_FILES: PackContentsLoader = {
  id: PackId.parse(ITEM_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles({ id: ITEM_PACK, title: 'Item fixtures', publisher: 'Pioneer tests', license: 'homebrew' }, [
      ITEM_FIXTURES.otherEntries,
    ]),
};
