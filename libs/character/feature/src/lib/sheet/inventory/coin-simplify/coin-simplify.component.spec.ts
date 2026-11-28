import { ITEM_FIXTURE_FILES } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { button, openInventory, patchSent, VALEROS } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** Valeros holding 27 copper and 3 silver. */
const SMALL_COINS = { ...VALEROS, inventory: { ...VALEROS.inventory, coins: { pp: 0, gp: 15, sp: 3, cp: 27 } } };

describe('CoinSimplify', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('trades small coins up as a simplifyCoins', async () => {
    const section = await openInventory(SMALL_COINS);

    button(section, 'Simplify').click();

    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({ expectedVersion: 3, patch: { field: 'simplifyCoins' } });
  });

  it('is disabled, with the reason, when no coin can be traded up', async () => {
    const section = await openInventory();

    await vi.waitFor(() => {
      expect(button(section, 'Simplify').hasAttribute('disabled')).toBe(true);
      expect(section.textContent).toContain('Nothing to trade up');
    });
  });
});
