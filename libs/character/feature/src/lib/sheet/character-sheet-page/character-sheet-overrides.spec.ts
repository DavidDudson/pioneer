import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OverrideMode, SheetMode } from '@pioneer/character/domain';
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

/** Opens the override drawer on Perception the way the sheet's own URL does: no row offers a link to it. */
async function open(mode: OverrideMode): Promise<HTMLElement> {
  fakeDialog();
  const { root } = await openSheet(FIGHTER);
  const router = TestBed.inject(Router);
  const page = router.url.split('?')[0] ?? router.url;
  await router.navigateByUrl(`${page}?override=open&overrideStatistic=perception&overrideMode=${mode}`);
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
  it('offers no Adjust or Set links on a statistic', async () => {
    const { root } = await openSheet(FIGHTER);

    await vi.waitFor(() => {
      expect(root.querySelector('pio-statistic-line')).not.toBeNull();
    });
    expect(root.querySelector('a[aria-label="Adjust Perception"]')).toBeNull();
    expect(root.querySelector('a[aria-label="Set Perception"]')).toBeNull();
  });

  it('keeps submit off with no reason, and reads the error out', async () => {
    const root = await open(OverrideMode.Adjust);

    await vi.waitFor(() => {
      expect(submitOf(root).disabled).toBe(true);
    });
    type(present(formOf(root).querySelector('textarea')), '   ');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(formOf(root).textContent).toContain('Say why this statistic differs');
    expect(submitOf(root).disabled).toBe(true);
  });

  it('sends an adjust override with its amount, type and reason', async () => {
    const root = await open(OverrideMode.Adjust);
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

  it('sends a set override for the Set mode, with no modifier type', async () => {
    const root = await open(OverrideMode.Set);
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

describe('CharacterSheet override authors', () => {
  const AUTHOR = '00000000-0000-4000-8000-00000000de01';
  const ADJUSTED = {
    ...FIGHTER,
    overrides: [
      {
        id: '00000000-0000-4000-8000-00000000ff01',
        target: 'ac',
        mode: 'adjust',
        value: 2,
        type: 'item',
        reason: 'Goggles',
        by: AUTHOR,
        at: '2026-10-30T10:00:00.000Z',
        revisions: [],
      },
    ],
  };

  async function breakdownText(authors: readonly object[]): Promise<string> {
    fakeDialog();
    const { root, harness } = await openSheet(ADJUSTED, { authors });
    const page = TestBed.inject(Router).url.split('?')[0] ?? '';
    await harness.navigateByUrl(`${page}?breakdown=open&statistic=ac`);
    const breakdown = await vi.waitFor(() => {
      const found = root.ownerDocument.querySelector<HTMLElement>('dialog pio-breakdown');
      return present(found);
    });
    const block = present(root.querySelector<HTMLElement>('pio-armor-class'));
    return `${block.textContent} ${breakdown.textContent}`.replaceAll(/\s+/gu, ' ');
  }

  it('marks the statistic and names the author, the time and the reason in its breakdown', async () => {
    const text = await breakdownText([{ userId: AUTHOR, displayName: 'Ada' }]);

    expect(text).toContain('Adjusted by hand');
    expect(text).toContain('set by Ada');
    expect(text).toContain('Goggles');
  });

  it('says a user set it when the server could not name them', async () => {
    const text = await breakdownText([]);

    expect(text).toContain('set by a user');
  });
});
