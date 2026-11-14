import { ITEM_FIXTURE_FILES, RuneFixture, runeFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { openInventory, row, SWORD, VALEROS } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** Valeros with a +1 longsword that has an authorized rune, held, and etched for `owner` when it names one. */
function authorizedFor(owner: string | undefined): typeof VALEROS {
  const sword = VALEROS.inventory.items.find((item) => item.id === SWORD);
  const etched = {
    ...sword,
    carry: { state: 'held', hands: 1 },
    runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.Authorized) }] },
    ...(owner === undefined ? {} : { state: { authorized: { owner, others: [] } } }),
  };
  const items = VALEROS.inventory.items.map((item) => (item.id === SWORD ? etched : item));
  return { ...VALEROS, inventory: { ...VALEROS.inventory, items } } as typeof VALEROS;
}

describe('InventorySection authorized weapon', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('warns a held weapon etched for someone else of the needles', async () => {
    const section = await openInventory(authorizedFor('Seelah'));
    const text = row(section, '+1 Authorized Longsword').textContent;

    expect(text).toContain('Owner of');
    expect(text).toContain('1d8 piercing damage and 1d4 persistent bleed damage');
  });

  it('says nothing of needles to the owner', async () => {
    const section = await openInventory(authorizedFor(VALEROS.name));
    const text = row(section, '+1 Authorized Longsword').textContent;

    expect(text).toContain('Owner of');
    expect(text).not.toContain('needles');
  });

  it('offers the owner and no warning while no owner is named', async () => {
    const section = await openInventory(authorizedFor(undefined));
    const text = row(section, '+1 Authorized Longsword').textContent;

    expect(text).toContain('Owner of');
    expect(text).not.toContain('needles');
  });

  it('offers a weapon with no authorized rune no owner', async () => {
    const section = await openInventory();

    expect(row(section, 'Longsword').textContent).not.toContain('Owner of');
  });
});
