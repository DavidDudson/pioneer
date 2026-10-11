import { ITEM_FIXTURE_FILES } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  button,
  CLOAK,
  field,
  openInventory,
  patchSent,
  pick,
  present,
  row,
  settle,
  SWORD,
} from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

describe('InventorySection carrying and investing', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('holds the sword in two hands by sending how it is carried', async () => {
    const section = await openInventory();
    const carry = field(row(section, 'Longsword'), 'How Longsword is carried');
    present(carry.querySelector<HTMLElement>('button')).click();
    await settle();
    await pick(carry, '[frInlineEditor] button, button[frInlineEditor], fr-select button', 'Held in two hands');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'carryItem', id: SWORD, carry: { state: 'held', hands: 2 } },
    });
  });

  it('offers wearing only what is worn, and holding in one hand only what one hand holds', async () => {
    const section = await openInventory();
    const carry = field(row(section, 'Longsword'), 'How Longsword is carried');
    present(carry.querySelector<HTMLElement>('button')).click();
    await settle();
    present(carry.querySelector<HTMLElement>('fr-select button')).click();
    await settle();
    const options = await vi.waitFor(() => {
      const shown = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((each) =>
        each.textContent.trim(),
      );
      expect(shown.length).toBeGreaterThan(0);
      return shown;
    });
    expect(options).toStrictEqual(['Held in one hand', 'Held in two hands', 'Stowed', 'Dropped']);
  });

  it('takes investment off the cloak, offering it only for an item with the invested trait', async () => {
    const section = await openInventory();
    expect(row(section, 'Longsword').textContent).not.toContain('Whether Longsword is invested');
    const invest = field(row(section, 'Cloak'), 'Whether Cloak is invested');
    present(invest.querySelector<HTMLElement>('button')).click();
    await settle();
    button(invest, 'Invested').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'investItem', id: CLOAK, invested: false },
    });
  });

  it('counts the investments against the limit', async () => {
    const section = await openInventory();
    const panel = present(section.querySelector('pio-investments'));
    // The panel waits on the derived statistics, which read the core rules and Player Core's import.
    await vi.waitFor(
      async () => {
        await settle();
        expect(panel.textContent).toContain('1 of 10 invested');
      },
      { timeout: 3000 },
    );
  });
});
