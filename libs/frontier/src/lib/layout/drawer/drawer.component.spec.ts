import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { Drawer } from './drawer.component';

const settle = async (): Promise<void> => {
  await TestBed.inject(ApplicationRef).whenStable();
  await Promise.resolve();
};

/** Renders a drawer at `url` with a spell's detail projected. */
async function render(url: string, inputs: Readonly<Record<string, unknown>> = {}): Promise<HTMLElement> {
  await TestBed.inject(Router).navigateByUrl(url);
  const root = await renderProjected(Drawer, { title: 'Fireball', ...inputs }, [element('p', 'A burst of flame')]);
  document.body.append(root);
  onTestFinished(() => {
    root.remove();
  });
  await settle();
  return root;
}

/** Opens after the host is in the page, so the drawer can find the row it sits in. */
const renderOpen = async (): Promise<HTMLElement> => {
  const root = await render('/spells');
  await TestBed.inject(Router).navigateByUrl('/spells?drawer=open');
  await settle();
  return root;
};

const handle = (root: HTMLElement): HTMLElement => part(root, '[role="separator"]');

const step = (root: HTMLElement): string | null => handle(root).getAttribute('aria-valuenow');

/** Neither `<dialog>` methods nor `ResizeObserver` exist in jsdom: record the first and let a test drive the second. */
const dialog = { calls: [] as string[] };
const observed: { resize: (width: number) => void } = { resize: () => undefined };

function fakeBrowser(): void {
  dialog.calls = [];
  const define = (name: string, open: boolean): void => {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value(this: HTMLDialogElement): void {
        dialog.calls.push(name);
        this.toggleAttribute('open', open);
      },
    });
  };
  define('show', true);
  define('showModal', true);
  define('close', false);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      public readonly observe = vi.fn<() => void>();
      public readonly disconnect = vi.fn<() => void>();
      public constructor(notify: (entries: unknown[]) => void) {
        observed.resize = (width: number): void => {
          notify([{ contentRect: { width } }]);
        };
      }
    },
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
    for (const name of ['show', 'showModal', 'close']) {
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  });
}

/** Container widths in px either side of `lg`, which is 56rem: 896px at the default font size. */
const BELOW_LG = 600;
const ABOVE_LG = 1000;

const resizeTo = async (width: number): Promise<void> => {
  observed.resize(width);
  await settle();
};

const keydown = async (target: Element, key: string): Promise<void> => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle();
};

describe(Drawer, () => {
  beforeEach(() => {
    localStorage.clear();
    fakeBrowser();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }]), ...provideFrontierI18nTesting()],
    });
  });

  it('renders nothing while closed', async () => {
    const root = await render('/spells');
    expect(root.querySelector('dialog')).toBeNull();
    expect(root.classList.contains('hidden')).toBe(true);
  });

  it('opens from the query parameter as a labelled dialog with its content', async () => {
    const root = await render('/spells?drawer=open');
    expect(part(root, 'dialog').getAttribute('aria-label')).toBe('Fireball');
    expect(part(root, 'h2').textContent.trim()).toBe('Fireball');
    expect(part(root, 'p').textContent).toBe('A burst of flame');
  });

  it('opens when asked, writing the query parameter, and is docked, not modal', async () => {
    await render('/spells', { open: true });
    expect(TestBed.inject(Router).url).toBe('/spells?drawer=open');
    expect(dialog.calls).toStrictEqual(['show']);
  });

  it('moves focus to the title on open', async () => {
    const root = await render('/spells');
    await TestBed.inject(Router).navigateByUrl('/spells?drawer=open');
    await settle();
    expect(document.activeElement).toBe(part(root, '[tabindex="-1"]'));
  });

  it('closes from its button and drops only its query parameter', async () => {
    const root = await render('/spells?drawer=open&sort=name');
    part(root, 'button').click();
    await settle();
    expect(root.querySelector('dialog')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/spells?sort=name');
  });

  it('closes on Escape while focus is inside it', async () => {
    const root = await render('/spells?drawer=open');
    await keydown(part(root, 'button'), 'Escape');
    expect(root.querySelector('dialog')).toBeNull();
  });

  it('returns focus to what had it when the drawer opened', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    onTestFinished(() => {
      opener.remove();
    });
    opener.focus();
    const root = await render('/spells?drawer=open');
    part(root, 'button').click();
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it('reads another parameter when told to', async () => {
    const root = await render('/spells?detail=open', { param: 'detail' });
    expect(root.querySelector('dialog')).not.toBeNull();
  });

  describe('overlay below lg', () => {
    it('shows the open drawer as a modal dialog and takes no room in the page', async () => {
      const root = await renderOpen();
      await resizeTo(BELOW_LG);
      expect(dialog.calls).toStrictEqual(['show', 'close', 'showModal']);
      expect(root.classList.contains('contents')).toBe(true);
    });

    it('hides the resize handle and keeps the stored width', async () => {
      localStorage.setItem('fr-drawer-width', 'wide');
      const root = await renderOpen();
      await resizeTo(BELOW_LG);
      expect(root.querySelector('[role="separator"]')).toBeNull();
      expect(localStorage.getItem('fr-drawer-width')).toBe('wide');
    });

    it('closes on the dialog cancel (Escape), dropping the query parameter', async () => {
      const root = await renderOpen();
      await resizeTo(BELOW_LG);
      part(root, 'dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
      await settle();
      expect(TestBed.inject(Router).url).toBe('/spells');
    });

    it('returns focus to the opener on close', async () => {
      const opener = document.createElement('button');
      document.body.append(opener);
      onTestFinished(() => {
        opener.remove();
      });
      opener.focus();
      const root = await renderOpen();
      await resizeTo(BELOW_LG);
      part(root, 'button').click();
      await settle();
      expect(document.activeElement).toBe(opener);
    });

    it('switches mode across lg without closing, on the same dialog', async () => {
      const root = await renderOpen();
      const panel = part(root, 'dialog');
      await resizeTo(BELOW_LG);
      await resizeTo(ABOVE_LG);
      expect(dialog.calls).toStrictEqual(['show', 'close', 'showModal', 'close', 'show']);
      expect(part(root, 'dialog')).toBe(panel);
      expect(handle(root).getAttribute('aria-valuetext')).toBe('Default width');
    });
  });

  describe('resize handle', () => {
    it('is a vertical separator that reports the width step', async () => {
      const root = await render('/spells?drawer=open');
      const values = ['aria-orientation', 'aria-valuemin', 'aria-valuenow', 'aria-valuemax', 'aria-valuetext'].map(
        (name) => handle(root).getAttribute(name),
      );
      expect(values).toStrictEqual(['vertical', '0', '1', '2', 'Default width']);
    });

    it('widens on ArrowLeft, narrows on ArrowRight and stops at the ends', async () => {
      const root = await render('/spells?drawer=open');
      const steps: (string | null)[] = [];
      await keydown(handle(root), 'ArrowLeft');
      steps.push(step(root));
      await keydown(handle(root), 'ArrowLeft');
      steps.push(step(root));
      await keydown(handle(root), 'ArrowRight');
      steps.push(step(root));
      await keydown(handle(root), 'ArrowRight');
      steps.push(step(root));
      await keydown(handle(root), 'ArrowRight');
      steps.push(step(root));
      expect(steps).toStrictEqual(['2', '2', '1', '0', '0']);
    });

    it('jumps to the ends with Home and End', async () => {
      const root = await render('/spells?drawer=open');
      await keydown(handle(root), 'End');
      expect(handle(root).getAttribute('aria-valuetext')).toBe('Wide');
      await keydown(handle(root), 'Home');
      expect(handle(root).getAttribute('aria-valuetext')).toBe('Narrow');
    });

    it('sizes the docked drawer by token and remembers the width', async () => {
      const root = await render('/spells?drawer=open');
      await keydown(handle(root), 'End');
      expect(root.className).toContain('w-drawer-wide');
      expect(localStorage.getItem('fr-drawer-width')).toBe('wide');
    });

    it('starts at the remembered width', async () => {
      localStorage.setItem('fr-drawer-width', 'narrow');
      const root = await render('/spells?drawer=open');
      expect(root.className).toContain('w-drawer-narrow');
    });
  });
});
