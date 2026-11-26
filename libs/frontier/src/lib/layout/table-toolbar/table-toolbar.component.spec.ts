import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { TableToolbarHost } from '../../testing/table-toolbar-host';
import { TableToolbar } from './table-toolbar.component';

interface Rendered {
  readonly root: HTMLElement;
  readonly component: ComponentRef<TableToolbarHost>;
}

interface HostInputs {
  readonly count?: string;
  readonly withFilters?: boolean;
  readonly withView?: boolean;
}

/** Renders the toolbar host and returns its element. */
async function render(inputs: HostInputs = {}): Promise<Rendered> {
  const component = createComponent(TableToolbarHost, { environmentInjector: TestBed.inject(EnvironmentInjector) });
  onTestFinished(() => {
    component.destroy();
  });

  for (const [name, value] of Object.entries(inputs)) {
    component.setInput(name, value);
  }

  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const root = component.location.nativeElement as HTMLElement;

  return { root, component };
}

/** The toolbar's Filters and Columns buttons. */
function buttons(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')];
}

/** The classes of the box that holds `text`: its inner element carries the visibility classes. */
function classesOf(root: HTMLElement, text: string): string[] {
  return [...root.querySelectorAll('fr-box > div')]
    .filter((inner) => inner.textContent.trim() === text)
    .flatMap((inner) => inner.className.split(' '));
}

describe(TableToolbar, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('is a labelled search landmark and keeps a gap to what follows', async () => {
    const { root } = await render();
    const toolbar = root.querySelector('fr-table-toolbar');
    expect(toolbar?.getAttribute('role')).toBe('search');
    expect(toolbar?.getAttribute('aria-label')).toBe('Search spells');
    expect(toolbar?.className.split(' ')).toContain('pb-md');
  });

  it('announces the result count politely and atomically', async () => {
    const { root, component } = await render();
    const live = root.querySelector('[aria-live]');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.getAttribute('aria-atomic')).toBe('true');
    expect(live?.textContent.trim()).toBe('3 results');

    component.setInput('count', '1 result');
    await TestBed.inject(ApplicationRef).whenStable();
    expect(live?.textContent.trim()).toBe('1 result');
  });

  it('offers a Filters and a Columns button only for the slots it has', async () => {
    const both = await render();
    expect(buttons(both.root).map((button) => button.textContent.trim())).toStrictEqual(['Filters', 'Columns']);

    const filtersOnly = await render({ withView: false });
    expect(buttons(filtersOnly.root).map((button) => button.textContent.trim())).toStrictEqual(['Filters']);

    const none = await render({ withFilters: false, withView: false });
    expect(buttons(none.root)).toStrictEqual([]);
  });

  it('keeps a slot hidden below md until its button is pressed', async () => {
    const { root } = await render();
    expect(classesOf(root, 'Filter content')).toContain('hidden');
    expect(classesOf(root, 'View content')).toContain('hidden');

    const [filters] = buttons(root);
    filters?.click();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(filters?.getAttribute('aria-pressed')).toBe('true');
    expect(classesOf(root, 'Filter content')).not.toContain('hidden');
    expect(classesOf(root, 'View content')).toContain('hidden');
  });
});
