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

import { itemContent } from '../inventory-content';
import type { ItemContent } from '../inventory-content';

const ITEM_PACK = 'item-fixtures';

/** Player Core numbers (Foundry pf2e) for the items the inventory tests carry. */
const BACKPACK_CAPACITY = 4;
const BACKPACK_IGNORED = 2;

/** The items `ITEM_FIXTURES` holds, by name. */
export const ItemFixture = {
  Backpack: 'backpack',
  Rope: 'rope',
  Longsword: 'longsword',
  LeatherArmor: 'leather-armor',
  SteelShield: 'steel-shield',
  HealingPotion: 'healing-potion',
  Diamond: 'diamond',
} as const;
export type ItemFixture = (typeof ItemFixture)[keyof typeof ItemFixture];

const ITEMS = {
  [ItemFixture.Backpack]: {
    kind: ContentKind.Equipment,
    data: {
      bulk: 'negligible',
      usage: { type: 'worn', slot: 'backpack' },
      container: { capacity: BACKPACK_CAPACITY, ignored: BACKPACK_IGNORED, heldBulk: 'light' },
    },
  },
  [ItemFixture.Rope]: { kind: ContentKind.Equipment, data: { bulk: 'light' } },
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
} as const satisfies Record<ItemFixture, { readonly kind: ContentKind; readonly data: object }>;

/** A pack of one item of every carried kind, a backpack among them to stow things in. */
function itemPack(): ContentPack {
  const builder = new ContentPackBuilder().withId(ITEM_PACK);
  for (const [name, { kind, data }] of Object.entries(ITEMS)) {
    builder.withItem(kind, name, data);
  }
  return builder.build();
}

export const ITEM_FIXTURES: ContentPack = itemPack();

/** The id of the fixture item `name`. */
export function itemFixtureId(name: ItemFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(ITEM_PACK), EntrySlug.parse(`${ITEMS[name].kind}:${name}`)));
}

/** `ITEM_FIXTURES` as the inventory reads it. */
export function itemFixtureContent(): ItemContent {
  const registry = new ContentRegistry();
  registry.register(ITEM_FIXTURES);
  return itemContent(registry);
}

/** `ITEM_FIXTURES` as content files, for the browser's content bundles in tests. */
export const ITEM_FIXTURE_FILES: PackContentsLoader = {
  id: PackId.parse(ITEM_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles({ id: ITEM_PACK, title: 'Item fixtures', publisher: 'Pioneer tests', license: 'homebrew' }, [
      ITEM_FIXTURES.otherEntries,
    ]),
};
