import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import {
  button,
  field,
  id,
  LISTBOX_PX,
  OPTION_PX,
  openInventory,
  patchSent,
  pick,
  present,
  ROPE,
  row,
  settle,
  SWORD,
  typeInto,
  VALEROS,
} from '../../../testing/inventory-sheet-testing';

describe('InventorySection', () => {
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
    present(place.querySelector<HTMLElement>('button')).click();
    await settle();
    await pick(place, '[frInlineEditor] button, button[frInlineEditor], fr-select button', 'Not in a container');
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

  it('adds a picked item loose, sending no container, then clears the form', async () => {
    const section = await openInventory();
    const form = present(section.querySelector<HTMLElement>('pio-add-item'));
    // Nothing is laid out in jsdom: give the virtualised listbox a height and each option a row, as frontier's own specs do.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(LISTBOX_PX);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: LISTBOX_PX, height: OPTION_PX }),
    );
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const search = present(form.querySelector<HTMLInputElement>('input[role="combobox"]'));
    search.value = 'Dia';
    search.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    const diamond = await vi.waitFor(
      () =>
        present(
          [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
            (each) => each.textContent.trim() === 'Diamond',
          ),
        ),
      { timeout: 3000 },
    );
    diamond.click();
    await settle();
    button(form, 'Add').click();
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'addItem', item: itemFixtureId(ItemFixture.Diamond), quantity: 1 },
    });
    request.flush({ character: { ...VALEROS, version: 4 }, slots: [], cleared: [] });
    await vi.waitFor(async () => {
      await settle();
      expect(present(form.querySelector<HTMLInputElement>('input[role="combobox"]')).value).toBe('');
    });
  });
});
