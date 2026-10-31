import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';

const openSheet = openerAt(SheetMode.Encounter);

const FIGHTER = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' } },
};

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

function link(root: HTMLElement, name: string): HTMLAnchorElement {
  return present(root.querySelector<HTMLAnchorElement>(`a[aria-label="${name}"]`));
}

async function open(name: string): Promise<HTMLElement> {
  fakeDialog();
  const { root } = await openSheet(FIGHTER);
  const adjust = await vi.waitFor(() => link(root, name));
  adjust.click();
  await TestBed.inject(ApplicationRef).whenStable();
  return root;
}

function formOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-override-form'));
}

function submitOf(root: HTMLElement): HTMLButtonElement {
  return present(formOf(root).querySelector<HTMLButtonElement>('button[type="submit"]'));
}

function type(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  element.value = text;
  element.dispatchEvent(new Event('input'));
  element.dispatchEvent(new Event('blur'));
}

describe('CharacterSheet overrides', () => {
  it('offers Adjust and Set on a statistic, as links a keyboard reaches', async () => {
    const { root } = await openSheet(FIGHTER);

    await vi.waitFor(() => {
      expect(link(root, 'Adjust Perception').tabIndex).toBe(0);
      expect(link(root, 'Set Perception').tabIndex).toBe(0);
    });
  });

  it('keeps submit off with no reason, and reads the error out', async () => {
    const root = await open('Adjust Perception');

    await vi.waitFor(() => {
      expect(submitOf(root).disabled).toBe(true);
    });
    type(present(formOf(root).querySelector('textarea')), '   ');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(formOf(root).textContent).toContain('Say why this statistic differs');
    expect(submitOf(root).disabled).toBe(true);
  });

  it('sends an adjust override with its amount, type and reason', async () => {
    const root = await open('Adjust Perception');
    await vi.waitFor(() => {
      expect(formOf(root).tagName).toBe('PIO-SHEET-OVERRIDE-FORM');
    });

    type(present(formOf(root).querySelector('input')), '2');
    type(present(formOf(root).querySelector('textarea')), 'A blessing from the GM');
    await TestBed.inject(ApplicationRef).whenStable();
    submitOf(root).click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: {
        field: 'addOverride',
        override: { target: 'perception', mode: 'adjust', value: 2, reason: 'A blessing from the GM' },
      },
    });
  });

  it('sends a set override for the Set link, with no modifier type', async () => {
    const root = await open('Set Perception');
    await vi.waitFor(() => {
      expect(formOf(root).tagName).toBe('PIO-SHEET-OVERRIDE-FORM');
    });

    type(present(formOf(root).querySelector('input')), '12');
    type(present(formOf(root).querySelector('textarea')), 'Pinned by the GM');
    await TestBed.inject(ApplicationRef).whenStable();
    submitOf(root).click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toStrictEqual({
      expectedVersion: 1,
      patch: {
        field: 'addOverride',
        override: { target: 'perception', mode: 'set', value: 12, reason: 'Pinned by the GM' },
      },
    });
  });
});
