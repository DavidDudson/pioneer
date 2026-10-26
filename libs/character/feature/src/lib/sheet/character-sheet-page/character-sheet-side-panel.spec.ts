import { Component } from '@angular/core';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IDLE_SCHEDULER, ShellSearch } from '@pioneer/shared/web';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import characterMessages from '../../../i18n/en.json';
import { SHEET_SIDE_PANEL } from '../../data/sheet-side-panel';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

/** Stands in for the app's content search, which the character feature may not import. */
// oxlint-disable-next-line @angular-eslint/component-max-inline-declarations -- an empty stand-in, not worth a file
@Component({ selector: 'pio-stub-side-panel', template: '' })
class StubSidePanel {}

/** Idle is now, so the panel loads as soon as the sheet renders. */
const IDLE_NOW = {
  provide: IDLE_SCHEDULER,
  useValue: (task: () => void): void => {
    task();
  },
};
const WITH_PANEL = [
  IDLE_NOW,
  { provide: SHEET_SIDE_PANEL, useValue: async (): Promise<Type<unknown>> => StubSidePanel },
];

/** The `<dialog>` methods and `ResizeObserver` the drawer docks with are missing from jsdom. */
function fakeBrowser(): void {
  for (const [name, open] of [
    ['show', true],
    ['showModal', true],
    ['close', false],
  ] as const) {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value(this: HTMLDialogElement): void {
        this.toggleAttribute('open', open);
      },
    });
  }
  vi.stubGlobal(
    'ResizeObserver',
    class {
      public readonly observe = vi.fn<() => void>();
      public readonly disconnect = vi.fn<() => void>();
      public readonly unobserve = vi.fn<() => void>();
    },
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
    for (const name of ['show', 'showModal', 'close']) {
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  });
}

const openButton = (root: HTMLElement): HTMLButtonElement | undefined =>
  [...root.querySelectorAll('pio-sheet-header-actions button')].find(
    (button): button is HTMLButtonElement => textOf(button) === characterMessages.sheet.sidePanel.open,
  );

describe('CharacterSheetPage side panel', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('offers no side panel, and leaves the shell search, when the app provides none', async () => {
    const { root } = await openSheet(undefined, { providers: [IDLE_NOW] });

    expect(openButton(root)).toBeUndefined();
    expect(root.querySelector('pio-stub-side-panel')).toBeNull();
    expect(TestBed.inject(ShellSearch).hidden()).toBe(false);
  });

  it('loads the app side panel into the drawer and hides the shell search', async () => {
    const { root } = await openSheet(undefined, { providers: WITH_PANEL });

    await vi.waitFor(() => {
      expect(TestBed.inject(ShellSearch).hidden()).toBe(true);
    });
    expect(present(openButton(root))).toBeDefined();
  });

  it('opens the drawer from the header button, keeps it in the address and closes it with Escape', async () => {
    fakeBrowser();
    const { root } = await openSheet(undefined, { providers: WITH_PANEL });
    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      expect(openButton(root)).toBeDefined();
    });
    expect(root.querySelector('dialog')).toBeNull();

    present(openButton(root)).click();
    await vi.waitFor(() => {
      expect(router.url).toContain('drawer=open');
    });
    const dialog = await vi.waitFor(() => present(root.querySelector('dialog')));
    expect(dialog.getAttribute('aria-label')).toBe(characterMessages.sheet.sidePanel.title);
    expect(dialog.querySelector('pio-stub-side-panel')).not.toBeNull();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(router.url).not.toContain('drawer');
    });
    expect(root.querySelector('dialog')).toBeNull();
  });

  it('keeps the shell search and shows no panel when the panel fails to load', async () => {
    const loader = vi.fn<() => Promise<Type<unknown>>>().mockRejectedValue(new Error('offline'));
    const { root } = await openSheet(undefined, {
      providers: [IDLE_NOW, { provide: SHEET_SIDE_PANEL, useValue: loader }],
    });

    await vi.waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });
    // Past the microtasks in which the host handles the rejection.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(TestBed.inject(ShellSearch).hidden()).toBe(false);
    expect(root.querySelector('pio-stub-side-panel')).toBeNull();
  });

  it('offers no button and opens no empty drawer when the panel fails to load', async () => {
    fakeBrowser();
    const loader = vi.fn<() => Promise<Type<unknown>>>().mockRejectedValue(new Error('offline'));
    const { root } = await openSheet(undefined, {
      providers: [IDLE_NOW, { provide: SHEET_SIDE_PANEL, useValue: loader }],
    });
    await TestBed.inject(Router).navigateByUrl(`${TestBed.inject(Router).url}?drawer=open`);
    await vi.waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });
    // Past the microtasks in which the host handles the rejection.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(openButton(root)).toBeUndefined();
    expect(root.querySelector('dialog')).toBeNull();
  });

  it('asks the panel for the cursor each time the button is pressed, open or not', async () => {
    fakeBrowser();
    const { root } = await openSheet(undefined, { providers: WITH_PANEL });
    const search = TestBed.inject(ShellSearch);
    await vi.waitFor(() => {
      expect(openButton(root)).toBeDefined();
    });

    present(openButton(root)).click();
    await vi.waitFor(() => {
      expect(search.focusRequests()).toBe(1);
    });
    present(openButton(root)).click();

    await vi.waitFor(() => {
      expect(search.focusRequests()).toBe(2);
    });
  });

  it('does not hide the shell search for a panel that arrives after the sheet is left', async () => {
    const { promise: late, resolve: arrive } = Promise.withResolvers<Type<unknown>>();
    const loader = vi.fn<() => Promise<Type<unknown>>>(async () => late);
    const { harness } = await openSheet(undefined, {
      providers: [IDLE_NOW, { provide: SHEET_SIDE_PANEL, useValue: loader }],
    });
    await vi.waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });

    harness.fixture.destroy();
    arrive(StubSidePanel);
    // Past the microtasks in which the host picks the panel up.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(TestBed.inject(ShellSearch).hidden()).toBe(false);
  });

  it('waits for the browser to be idle before loading the panel', async () => {
    const idleTasks: (() => void)[] = [];
    const loader = vi.fn<() => Promise<Type<unknown>>>(async () => StubSidePanel);
    await openSheet(undefined, {
      providers: [
        {
          provide: IDLE_SCHEDULER,
          useValue: (task: () => void): void => {
            idleTasks.push(task);
          },
        },
        { provide: SHEET_SIDE_PANEL, useValue: loader },
      ],
    });
    expect(loader).not.toHaveBeenCalled();

    for (const task of idleTasks) {
      task();
    }

    await vi.waitFor(() => {
      expect(TestBed.inject(ShellSearch).hidden()).toBe(true);
    });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('shows the shell search again once the sheet is left', async () => {
    const { harness, root } = await openSheet(undefined, { providers: WITH_PANEL });
    await vi.waitFor(() => {
      expect(openButton(root)).toBeDefined();
    });

    harness.fixture.destroy();

    expect(TestBed.inject(ShellSearch).hidden()).toBe(false);
  });
});
