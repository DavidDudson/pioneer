import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { button, field, openInventory, patchSent, row, typeInto, VALEROS } from '../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';

const CALIBURN = '88888888-8888-4888-8888-888888888888';
const KEY_ITEM = '99999999-9999-4999-8999-999999999999';

/** Valeros with Caliburn, a key item the GM gave him: a longsword stowed under the GM's name for it. */
const WITH_KEY_ITEM = {
  ...VALEROS,
  inventory: {
    ...VALEROS.inventory,
    items: [
      ...VALEROS.inventory.items,
      {
        id: CALIBURN,
        item: itemFixtureId(ItemFixture.Longsword),
        quantity: 1,
        name: 'Caliburn',
        carry: { state: 'stowed' },
        keyItem: KEY_ITEM,
      },
    ],
  },
};

describe('a key item on the sheet', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('is listed as a key item, not as a warning', async () => {
    const section = await openInventory(WITH_KEY_ITEM, WITH_KEY_ITEM.inventory.items.length);
    const caliburn = row(section, 'Caliburn');
    expect(caliburn.textContent).toContain('Key item');
    expect(caliburn.querySelector('pio-inventory-breaks')?.textContent.trim()).toBe('');
  });

  it('cannot be removed or sold by its player, nor its quantity changed', async () => {
    const section = await openInventory(WITH_KEY_ITEM, WITH_KEY_ITEM.inventory.items.length);
    const caliburn = row(section, 'Caliburn');
    const labels = [...caliburn.querySelectorAll('button')].map((each) => each.textContent.trim());
    expect(labels.some((label) => label.startsWith('Remove'))).toBe(false);
    expect(caliburn.textContent).not.toContain('Quantity of Caliburn');
  });

  it('still offers an everyday item its Remove', async () => {
    const section = await openInventory(WITH_KEY_ITEM, WITH_KEY_ITEM.inventory.items.length);
    const longsword = row(section, 'Longsword');
    expect(button(longsword, 'Remove Longsword').textContent).toContain('Remove Longsword');
  });

  it('can still be renamed by its player', async () => {
    const section = await openInventory(WITH_KEY_ITEM, WITH_KEY_ITEM.inventory.items.length);
    await typeInto(field(row(section, 'Caliburn'), 'Your name for Caliburn'), 'Excalibur');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'renameItem', id: CALIBURN, name: 'Excalibur' },
    });
  });
});
