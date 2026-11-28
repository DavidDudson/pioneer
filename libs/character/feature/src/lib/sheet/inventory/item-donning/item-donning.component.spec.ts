import {
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { openInventory, row, VALEROS } from '../../../testing/inventory-sheet-testing';
import type { JsonObject } from '../../../testing/json-fixture';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

const ARMOUR = '55555555-5555-4555-8555-555555555555';

/** The rows Valeros has with the armour added. */
const ROWS = VALEROS.inventory.items.length + 1;

/** Valeros wearing `armour`, with `rune` etched on it when given. */
function wearing(armour: ItemFixture, rune: RuneFixture | undefined): JsonObject {
  const runes = rune === undefined ? {} : { runes: { property: [{ rune: runeFixtureId(rune) }] } };
  const worn = { id: ARMOUR, item: itemFixtureId(armour), quantity: 1, carry: { state: 'worn' }, ...runes };

  return {
    ...VALEROS,
    inventory: { ...VALEROS.inventory, items: [...VALEROS.inventory.items, worn] },
  };
}

describe('InventorySection donning armour', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('says light armour with a ready rune can be donned as a single action', async () => {
    const section = await openInventory(wearing(ItemFixture.LeatherArmor, RuneFixture.Ready), ROWS);

    expect(row(section, 'Ready Leather-armor').textContent).toContain('single action');
  });

  it('says medium armour with a ready rune is a 2-action activity to don', async () => {
    const section = await openInventory(wearing(ItemFixture.HideArmor, RuneFixture.Ready), ROWS);

    expect(row(section, 'Ready Hide-armor').textContent).toContain('2-action activity');
  });

  it('says nothing of donning armour with no ready rune', async () => {
    const section = await openInventory(wearing(ItemFixture.HideArmor, undefined), ROWS);

    expect(row(section, 'Hide-armor').textContent).not.toContain('donned');
  });
});
