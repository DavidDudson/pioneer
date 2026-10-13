import { TestBed } from '@angular/core/testing';
import {
  activationUseKey,
  addItem,
  Boundary,
  Character,
  EMPTY_INVENTORY,
  InventoryItemId,
  ItemQuantity,
  ResourcesSpentSchema,
} from '@pioneer/character/domain';
import { CharacterBuilder, ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { Slug } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { countedViews } from './sheet-counted';
import { EQUIPMENT_CONTENT_KINDS } from './sheet-equipment';

const BOOTS = InventoryItemId.parse('88888888-8888-4888-8888-888888888888');
const SKIES = Slug.parse('take-to-the-skies');

function wearingBoots(quantity: number): Character {
  const built = new CharacterBuilder().build();
  const inventory = addItem(EMPTY_INVENTORY, {
    id: BOOTS,
    item: itemFixtureId(ItemFixture.WingedBoots),
    quantity: ItemQuantity.parse(quantity),
    container: undefined,
  });
  return new Character({
    document: { ...built.document, inventory },
    version: built.version,
    createdAt: built.createdAt,
    updatedAt: built.updatedAt,
  });
}

async function registryWithItems(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([ITEM_FIXTURE_FILES]) });
  return TestBed.inject(ContentLoader).registry(EQUIPMENT_CONTENT_KINDS);
}

describe(countedViews, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('lists an item activation with its uses left and the boundary it comes back on', async () => {
    const registry = await registryWithItems();
    const key = activationUseKey(BOOTS, SKIES);

    const fresh = countedViews(registry, wearingBoots(1), ResourcesSpentSchema.parse({}));
    const spent = countedViews(registry, wearingBoots(1), ResourcesSpentSchema.parse({ uses: { [key]: 1 } }));

    expect(fresh.uses).toMatchObject([
      { key, name: 'Winged-boots: Take to the Skies', current: 1, max: 1, boundary: Boundary.Rest },
    ]);
    expect(spent.uses).toMatchObject([{ key, current: 0, max: 1 }]);
  });

  it('gives a line of several items a use each', async () => {
    const registry = await registryWithItems();

    const views = countedViews(registry, wearingBoots(3), ResourcesSpentSchema.parse({}));

    expect(views.uses).toMatchObject([{ current: 3, max: 3 }]);
  });
});
