import { ITEM_FIXTURE_FILES } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { button, openInventory, patchSent, present, settle } from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** Types `text` into the coin form's number field called `label`. */
async function fill(section: HTMLElement, label: string, text: string): Promise<void> {
  const loot = present(section.querySelector<HTMLElement>('pio-coin-loot'));

  const wrapper = present(
    [...loot.querySelectorAll<HTMLElement>('fr-number-field')].find((each) => each.textContent.includes(label)),
  );

  const input = present(wrapper.querySelector<HTMLInputElement>('input'));
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await settle();
}

describe('CoinLoot', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('adds a mix of coins with a reason and a note as a giftCoins', async () => {
    const section = await openInventory();
    await fill(section, 'Gold (gp)', '2');
    await fill(section, 'Copper (cp)', '7');
    const note = present(section.querySelector<HTMLInputElement>('pio-coin-loot fr-text-field input'));
    note.value = 'Goblin chief';
    note.dispatchEvent(new Event('input'));
    await settle();

    button(section, 'Add coins').click();

    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'giftCoins', coins: { pp: 0, gp: 2, sp: 0, cp: 7 }, reason: 'loot', note: 'Goblin chief' },
    });
  });

  it('takes coins as a takeCoins, with no note when none is written', async () => {
    const section = await openInventory();
    await fill(section, 'Gold (gp)', '3');

    button(section, 'Take coins').click();

    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'takeCoins', coins: { pp: 0, gp: 3, sp: 0, cp: 0 }, reason: 'loot' },
    });
  });

  it('disables Take, with the reason, when the coins are worth less', async () => {
    const section = await openInventory();
    await fill(section, 'Gold (gp)', '16');

    await vi.waitFor(() => {
      expect(button(section, 'Take coins').hasAttribute('disabled')).toBe(true);
      expect(section.textContent).toContain("The coins are worth less than that, so they can't be taken.");
    });
    expect(button(section, 'Add coins').hasAttribute('disabled')).toBe(false);
  });

  it('turns off both while nothing is entered', async () => {
    const section = await openInventory();

    expect(button(section, 'Add coins').hasAttribute('disabled')).toBe(true);
    expect(button(section, 'Take coins').hasAttribute('disabled')).toBe(true);
  });
});
