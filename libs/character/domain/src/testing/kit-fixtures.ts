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

import { kitContent } from '../kit-content';
import type { KitContent } from '../kit-content';
import { ITEM_FIXTURES, ItemFixture, itemFixtureId } from './item-content';

const KIT_PACK = 'kit-fixtures';

/** The kits `KIT_FIXTURES` holds, by name: each of `ITEM_FIXTURES`' items. */
export const KitFixture = {
  /** 2 gp: a backpack holding rope and 10 arrows, and a longsword beside it. */
  Explorer: 'explorer',
  /** A kit with no price, holding one diamond. */
  Keepsake: 'keepsake',
  /** 20 gp for an anvil: more than a starting purse holds. */
  Smithy: 'smithy',
} as const;
export type KitFixture = (typeof KitFixture)[keyof typeof KitFixture];

const EXPLORER_ARROWS = 10;

/** A kit's items as its `data` lists them: the fixture item and how many, with what a container holds. */
function kitLine(name: ItemFixture, quantity: number, contents: readonly object[] = []): object {
  const line = { item: itemFixtureId(name), quantity };
  return contents.length === 0 ? line : { ...line, contents };
}

const KITS: Readonly<Record<KitFixture, object>> = {
  [KitFixture.Explorer]: {
    price: { coins: { gp: 2 } },
    items: [
      kitLine(ItemFixture.Backpack, 1, [kitLine(ItemFixture.Rope, 1), kitLine(ItemFixture.Arrows, EXPLORER_ARROWS)]),
      kitLine(ItemFixture.Longsword, 1),
    ],
  },
  [KitFixture.Keepsake]: { items: [kitLine(ItemFixture.Diamond, 1)] },
  [KitFixture.Smithy]: { price: { coins: { gp: 20 } }, items: [kitLine(ItemFixture.Anvil, 1)] },
};

function kitPack(): ContentPack {
  const builder = new ContentPackBuilder().withId(KIT_PACK);
  for (const [name, data] of Object.entries(KITS)) {
    builder.withKit(name, data);
  }
  return builder.build();
}

/** Kits of `ITEM_FIXTURES`' items, a pack of their own: load both. */
export const KIT_FIXTURES: ContentPack = kitPack();

/** The id of the fixture kit `name`. */
export function kitFixtureId(name: KitFixture): ContentId {
  return ContentId.parse(contentId(PackId.parse(KIT_PACK), EntrySlug.parse(`${ContentKind.Kit}:${name}`)));
}

/** The kits in `KIT_FIXTURES`. */
export function kitFixtureContent(): KitContent {
  const registry = new ContentRegistry();
  registry.register(ITEM_FIXTURES);
  registry.register(KIT_FIXTURES);
  return kitContent(registry);
}

/** `KIT_FIXTURES` as content files, for the browser's content bundles in tests. */
export const KIT_FIXTURE_FILES: PackContentsLoader = {
  id: PackId.parse(KIT_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles({ id: KIT_PACK, title: 'Kit fixtures', publisher: 'Pioneer tests', license: 'homebrew' }, [
      KIT_FIXTURES.otherEntries,
    ]),
};
