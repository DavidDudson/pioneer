import { ITEM_FIXTURE_FILES, RuneFixture, runeFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { openInventory, row, SWORD, VALEROS } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

const SHIFTING_SWORD = {
  ...VALEROS.inventory.items.find((item) => item.id === SWORD),
  runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.Shifting) }] },
};

/** Valeros with a +1 shifting longsword. */
const SHIFTING = {
  ...VALEROS,
  inventory: {
    ...VALEROS.inventory,
    items: VALEROS.inventory.items.map((item) => (item.id === SWORD ? SHIFTING_SWORD : item)),
  },
};

describe('InventorySection shape', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('offers a weapon with a shifting rune a shape to shift into', async () => {
    const section = await openInventory(SHIFTING);

    expect(row(section, '+1 Shifting Longsword').textContent).toContain('Shape to shift');
  });

  it('offers a weapon with no shifting rune no shape', async () => {
    const section = await openInventory();

    expect(row(section, 'Longsword').textContent).not.toContain('Shape to shift');
  });
});
