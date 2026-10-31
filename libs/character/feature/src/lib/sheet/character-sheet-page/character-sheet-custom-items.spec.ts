import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { describe, expect, it, vi } from 'vitest';

import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';

const openSheet = openerAt(SheetMode.Exploration);

const COMB = '4f0c2a1e-6b1d-4c1a-8f3e-2d9a7b5c1e01';

/** Merisiel carrying one item an import kept by name. */
const WITH_COMB = {
  ...MERISIEL,
  inventory: {
    items: [],
    customItems: [{ id: COMB, name: 'Moon-silver comb', quantity: 2, origin: 'import' }],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

function customItems(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-custom-items'));
}

describe('CharacterSheetPage custom items', () => {
  it('lists an item an import kept by name, with how many and that it was imported', async () => {
    const { root } = await openSheet(WITH_COMB);

    await vi.waitFor(() => {
      expect(customItems(root).textContent).toContain('Moon-silver comb × 2');
    });
    expect(customItems(root).textContent).toContain('Imported');
  });

  it('removes it with the item removal', async () => {
    const { root } = await openSheet(WITH_COMB);
    const remove = await vi.waitFor(() => present(customItems(root).querySelector<HTMLButtonElement>('button')));

    remove.click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({ patch: { field: 'removeItem', id: COMB } });
  });

  it('shows nothing when the character has none', async () => {
    const { root } = await openSheet();

    await vi.waitFor(() => {
      expect(customItems(root).textContent.trim()).toBe('');
    });
  });
});
