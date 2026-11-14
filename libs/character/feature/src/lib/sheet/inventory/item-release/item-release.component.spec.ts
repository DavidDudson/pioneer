import { ITEM_FIXTURE_FILES, RuneFixture, runeFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { openInventory, row, SWORD, VALEROS } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** Valeros with a +1 longsword that has an animated rune, set free when `released`. */
function animated(released: boolean): typeof VALEROS {
  const sword = VALEROS.inventory.items.find((item) => item.id === SWORD);
  const etched = {
    ...sword,
    runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.Animated) }] },
    ...(released ? { state: { released: true } } : {}),
  };
  return {
    ...VALEROS,
    inventory: {
      ...VALEROS.inventory,
      items: VALEROS.inventory.items.map((item) => (item.id === SWORD ? etched : item)),
    },
  } as typeof VALEROS;
}

describe('InventorySection animated weapon', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('offers a weapon with an animated rune to be set free', async () => {
    const section = await openInventory(animated(false));

    expect(row(section, '+1 Animated Longsword').textContent).toContain('free');
  });

  it('says how a set-free weapon attacks, and offers to recall it', async () => {
    const section = await openInventory(animated(true));
    const text = row(section, '+1 Animated Longsword').textContent;

    expect(text).toContain('attack modifier of +25');
    expect(text).toContain('Recall');
  });

  it('offers a weapon with no animated rune nothing to set free', async () => {
    const section = await openInventory();

    expect(row(section, 'Longsword').textContent).not.toContain('free');
  });
});
