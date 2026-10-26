import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

const openSheet = openerAt(SheetMode.Encounter);

/** The panel of the drawer that is open; the side panel is closed, so it has none. */
function panelOf(root: HTMLElement): HTMLElement | null {
  return root.ownerDocument.querySelector<HTMLElement>('dialog');
}

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

/** The address being shown, with `query` in place of its own. */
function withQuery(query: string): string {
  return `${TestBed.inject(Router).url.split('?', 1).join('')}?${query}`;
}

describe('CharacterSheetPage breakdown drawer', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('shows no drawer until a stat link names a statistic', async () => {
    const { root } = await openSheet(MERISIEL);
    expect(panelOf(root)).toBeNull();
  });

  it('opens the breakdown of the statistic the address names', async () => {
    fakeDialog();
    const { root, harness } = await openSheet(MERISIEL);

    await harness.navigateByUrl(withQuery('breakdown=open&statistic=perception'));

    await vi.waitFor(() => {
      const drawer = present(panelOf(root));
      expect(textOf(drawer)).toContain('Perception');
      expect(drawer.querySelector('pio-breakdown')).not.toBeNull();
    });
  });

  it('shows nothing for a selector the sheet derives no statistic for', async () => {
    fakeDialog();
    const { root, harness } = await openSheet(MERISIEL);

    await harness.navigateByUrl(withQuery('breakdown=open&statistic=not-a-statistic'));

    expect(panelOf(root)).toBeNull();
  });
});
