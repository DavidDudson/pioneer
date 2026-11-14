import {
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { openInventory, row, SWORD, VALEROS } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

const OIL_LINE = {
  id: '88888888-8888-4888-8888-888888888888',
  item: itemFixtureId(ItemFixture.WeaponOil),
  quantity: 2,
  carry: { state: 'stowed' },
};

/** The rows of Valeros's inventory with the oil added. */
const ROWS = VALEROS.inventory.items.length + 1;

/** Valeros with a +1 longsword that has a coating rune holding `stored`, and an oil in his pack. */
function coated(stored: readonly string[]): typeof VALEROS {
  const sword = VALEROS.inventory.items.find((item) => item.id === SWORD);
  const etched = {
    ...sword,
    runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.Coating) }] },
    ...(stored.length > 0 ? { state: { coating: stored } } : {}),
  };
  const items = [...VALEROS.inventory.items.map((item) => (item.id === SWORD ? etched : item)), OIL_LINE];
  return { ...VALEROS, inventory: { ...VALEROS.inventory, items } } as typeof VALEROS;
}

describe('InventorySection coating space', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('shows the poisons and oils stored in the space, each with a way to retrieve it', async () => {
    const section = await openInventory(coated([itemFixtureId(ItemFixture.WeaponOil)]), ROWS);
    const text = row(section, '+1 Coating Longsword').textContent;

    expect(text).toContain('Weapon-oil');
    expect(text).toContain('Retrieve');
    expect(text).toContain('1 tenths used');
  });

  it('offers an oil the character carries to stow in an empty space', async () => {
    const section = await openInventory(coated([]), ROWS);
    const text = row(section, '+1 Coating Longsword').textContent;

    expect(text).toContain('Nothing is stored');
    expect(text).toContain('Stow in');
  });

  it('offers a weapon with no coating rune no space', async () => {
    const section = await openInventory();

    expect(row(section, 'Longsword').textContent).not.toContain('Nothing is stored');
  });
});
