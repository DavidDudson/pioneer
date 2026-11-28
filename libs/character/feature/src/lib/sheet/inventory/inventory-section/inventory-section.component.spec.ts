import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ITEM_FIXTURE_FILES } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  button,
  field,
  id,
  openInventory,
  openInventoryUnder,
  patchSent,
  pickRow,
  present,
  ROPE,
  row,
  settle,
  SWORD,
  typeInto,
} from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** The core rules pack's Automatic Bonus Progression, as the character's list names it. */
const AUTOMATIC_BONUS_PROGRESSION = {
  variantId: '177bfa5d-9553-593c-9264-f4fddf67ca0c',
  name: 'Automatic Bonus Progression',
  packTitle: 'Core Rules',
};

describe('InventorySection', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('lists the backpack worn with the rope inside it, the sword held, and the coins the character has', async () => {
    const section = await openInventory();
    const headings = [...section.querySelectorAll('fr-heading')].map((heading) => heading.textContent.trim());
    expect(headings).toContain('Held');
    const rope = present(row(section, 'Backpack').querySelector('pio-inventory-row'));
    expect(rope.textContent).toContain('Climbing rope');
    expect(rope.textContent).toContain('× 2');
    expect(field(section, 'Gold (gp)').textContent).toContain('15');
    expect(field(section, 'Silver (sp)').textContent).toContain('0');
  });

  it('shows the coins in gold and every change to them, newest first', async () => {
    const section = await openInventory();
    const ledger = present(section.querySelector('pio-coin-ledger'));
    expect(ledger.textContent).toContain('15 gp in all');

    const entries = [...ledger.querySelectorAll('fr-list-item')].map((entry) =>
      entry.textContent.replaceAll(/\s+/gu, ' ').trim(),
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatch(/Shop purchase.*-5 gp/u);
    expect(entries[1]).toMatch(/Starting coins.*\+20 gp/u);
  });

  it('meters the Bulk carried against the limits Strength sets, the rope in the backpack ignored', async () => {
    const section = await openInventory();
    const bulk = present(section.querySelector('pio-bulk'));
    await vi.waitFor(() => {
      expect(bulk.textContent).toContain('Carrying 1 Bulk and 1 light item');
    });
    expect(bulk.textContent).toContain('Encumbered over 5 Bulk; can carry no more than 10 Bulk.');
  });

  it('removes a plain item on the first press', async () => {
    const section = await openInventory();
    button(row(section, 'Longsword'), 'Remove Longsword').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'removeItem', id: SWORD },
    });
  });

  it('asks again before removing an item with the player’s name, which adding it back would lose', async () => {
    const section = await openInventory();
    const rope = row(section, 'Climbing rope');
    button(rope, 'Remove Climbing rope').click();
    await settle();
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: `/api/characters/${id}` });
    button(rope, 'Remove Climbing rope? Press again').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'removeItem', id: ROPE },
    });
  });

  it('saves a quantity as setItemQuantity', async () => {
    const section = await openInventory();
    await typeInto(field(row(section, 'Longsword'), 'Quantity of Longsword'), '3');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'setItemQuantity', id: SWORD, quantity: 3 },
    });
  });

  it('clears a name back to the content’s by sending no name', async () => {
    const section = await openInventory();
    await typeInto(field(row(section, 'Climbing rope'), 'Your name for Climbing rope'), '');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'renameItem', id: ROPE },
    });
  });

  it('takes an item out of its container by sending no container, and shows a refusal in the field', async () => {
    const section = await openInventory();
    const place = field(row(section, 'Climbing rope'), 'Where Climbing rope is');
    await pickRow(place, 'Not in a container');
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({ expectedVersion: 3, patch: { field: 'moveItem', id: ROPE } });
    request.flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: ['patch', 'id'], message: { key: 'character.validation.itemNotFound' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await vi.waitFor(async () => {
      await settle();
      expect(place.textContent).toContain('This character no longer has that item.');
    });
  });

  it('saves a coin as the whole purse with that coin changed', async () => {
    const section = await openInventory();
    await typeInto(field(section, 'Silver (sp)'), '7');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'setCoins', coins: { pp: 0, gp: 15, sp: 7, cp: 0 } },
    });
  });

  it('says why runes add nothing while Automatic Bonus Progression is on', async () => {
    const variantRules = {
      decidedBy: 'character',
      manageable: true,
      enabled: [AUTOMATIC_BONUS_PROGRESSION],
      available: [],
    };

    const section = await openInventoryUnder(variantRules);

    await vi.waitFor(() => {
      expect(section.querySelector('fr-alert')?.textContent).toContain('Automatic Bonus Progression is on');
    });
  });

  it('shows no such note without the variant rule', async () => {
    const section = await openInventory();

    expect(section.querySelector('fr-alert')).toBeNull();
  });
});
