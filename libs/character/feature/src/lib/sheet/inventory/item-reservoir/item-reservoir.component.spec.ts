import { ITEM_FIXTURE_FILES, RuneFixture, runeFixtureId, spellFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { openInventory, row, SWORD, VALEROS } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** Valeros with a +1 longsword that has a spell reservoir rune, holding a spell of rank 1 when `held`. */
function reserved(held: boolean): typeof VALEROS {
  const sword = VALEROS.inventory.items.find((item) => item.id === SWORD);
  const etched = {
    ...sword,
    runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.SpellReservoir) }] },
    ...(held ? { state: { spell: { spell: spellFixtureId('heal'), rank: 1 } } } : {}),
  };
  const items = VALEROS.inventory.items.map((item) => (item.id === SWORD ? etched : item));
  return { ...VALEROS, inventory: { ...VALEROS.inventory, items } } as typeof VALEROS;
}

describe('InventorySection spell reservoir', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('shows the held spell with both ways to expend it', async () => {
    const section = await openInventory(reserved(true));
    const text = row(section, '+1 Spell-reservoir Longsword').textContent;

    expect(text).toContain('a spell of rank 1');
    expect(text).toContain('Channeled Release');
    expect(text).toContain('Safe Release');
  });

  it('says no spell is stored while the weapon is empty', async () => {
    const section = await openInventory(reserved(false));
    const text = row(section, '+1 Spell-reservoir Longsword').textContent;

    expect(text).toContain('No spell is stored');
    expect(text).not.toContain('Safe Release');
  });

  it('offers a weapon with no reservoir rune no spell', async () => {
    const section = await openInventory();

    expect(row(section, 'Longsword').textContent).not.toContain('No spell is stored');
  });
});
