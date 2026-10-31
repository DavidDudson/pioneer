import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

const AUTHOR = '00000000-0000-4000-8000-00000000de01';
const OVERRIDE = '00000000-0000-4000-8000-00000000ff01';

const FIGHTER = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' } },
};

const GOGGLES = {
  id: OVERRIDE,
  target: 'perception',
  mode: 'adjust',
  value: 2,
  type: 'item',
  reason: 'Goggles',
  by: AUTHOR,
  at: '2026-10-30T10:00:00.000Z',
  revisions: [],
};

const NAMES = [{ userId: AUTHOR, displayName: 'Ada' }];

const DIALOG_METHODS = ['show', 'showModal', 'close'];

/** Gives jsdom the dialog methods the drawer opens its panel with. */
function fakeDialog(): void {
  for (const name of DIALOG_METHODS) {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value(this: HTMLDialogElement): void {
        this.toggleAttribute('open', name !== 'close');
      },
    });
  }
  vi.stubGlobal(
    'ResizeObserver',
    class {
      public readonly observe = vi.fn<() => void>();
      public readonly unobserve = vi.fn<() => void>();
      public readonly disconnect = vi.fn<() => void>();
    },
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
    for (const name of DIALOG_METHODS) {
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  });
}

async function openWith(overrides: readonly object[]): Promise<HTMLElement> {
  fakeDialog();
  const { root } = await openSheet({ ...FIGHTER, overrides }, { authors: NAMES });
  return root;
}

async function section(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-overrides')));
}

function type(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  element.value = text;
  element.dispatchEvent(new Event('input'));
  element.dispatchEvent(new Event('blur'));
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function removeButton(root: HTMLElement): HTMLButtonElement {
  return present(root.querySelector<HTMLButtonElement>('button[aria-label="Remove the override on Perception"]'));
}

describe('CharacterSheet overrides section', () => {
  it('says what an override is when the character has none', async () => {
    const root = await openWith([]);

    const text = textOf(await section(root));
    expect(text).toContain('No overrides');
    expect(text).toContain('a change made by hand to a statistic');
  });

  it('lists an override with its statistic, effect, reason and author', async () => {
    const root = await openWith([GOGGLES]);

    const text = textOf(
      await vi.waitFor(async () => {
        const found = await section(root);
        expect(textOf(found)).toContain('Perception');
        return found;
      }),
    );
    expect(text).toContain('+2 item');
    expect(text).toContain('Goggles');
    expect(text).toContain('Set by Ada');
  });

  it('keeps the earlier states of an edited override visible, with who set them', async () => {
    const edited = {
      ...GOGGLES,
      value: 3,
      revisions: [{ by: AUTHOR, at: '2026-10-29T10:00:00.000Z', value: 1, type: 'item', reason: 'First guess' }],
    };
    const root = await openWith([edited]);

    const text = textOf(
      await vi.waitFor(async () => {
        const found = await section(root);
        expect(textOf(found)).toContain('Earlier states');
        expect(textOf(found)).toContain('Perception');
        return found;
      }),
    );
    expect(text).toContain('+3 item');
    expect(text).toContain('+1 item, set by Ada, “First guess”');
  });

  it('opens an override for editing and saves it as an edit of that override', async () => {
    const root = await openWith([GOGGLES]);
    const edit = await vi.waitFor(() =>
      present(root.querySelector<HTMLAnchorElement>('a[aria-label="Edit the override on Perception"]')),
    );
    edit.click();
    const form = await vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-override-form')));

    expect(present(form.querySelector('textarea')).value).toBe('Goggles');
    type(present(form.querySelector('input')), '3');
    type(present(form.querySelector('textarea')), 'Better goggles');
    await TestBed.inject(ApplicationRef).whenStable();
    present(form.querySelector<HTMLButtonElement>('button[type="submit"]')).click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: {
        field: 'editOverride',
        id: OVERRIDE,
        override: { target: 'perception', mode: 'adjust', value: 3, reason: 'Better goggles' },
      },
    });
  });

  it('removes an override only with a reason and a second press that names the statistic', async () => {
    const root = await openWith([GOGGLES]);
    const button = await vi.waitFor(() => removeButton(root));
    expect(button.disabled).toBe(true);

    type(present(root.querySelector<HTMLInputElement>('pio-sheet-override-row input')), 'The goggles broke');
    await TestBed.inject(ApplicationRef).whenStable();
    button.click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(textOf(button)).toContain('Press again to remove the override on Perception');
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: `/api/characters/${id}` });

    button.click();
    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'removeOverride', id: OVERRIDE, reason: 'The goggles broke' },
    });
  });

  it('marks an override the GM set and leaves the player no way to edit or remove it', async () => {
    const root = await openWith([{ ...GOGGLES, byRole: 'gm' }]);

    const text = textOf(
      await vi.waitFor(async () => {
        const found = await section(root);
        expect(textOf(found)).toContain('Perception');
        return found;
      }),
    );
    expect(text).toContain('GM');
    expect(text).toContain('Your GM set this, so only your GM can change or remove it.');
    expect(root.querySelector('a[aria-label="Edit the override on Perception"]')).toBeNull();
    expect(root.querySelector('button[aria-label="Remove the override on Perception"]')).toBeNull();
  });
});
