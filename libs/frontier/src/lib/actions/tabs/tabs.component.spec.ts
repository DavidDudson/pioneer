import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { TabsHost } from '../../testing/tabs-host';
import type { TabsHostTab } from '../../testing/tabs-host';
import { TabsAppearance, TabsOrientation } from './tabs-appearance';
import { Tabs } from './tabs.component';

interface Rendered {
  readonly fixture: ComponentFixture<TabsHost>;
  readonly nav: HTMLElement;
  readonly links: readonly HTMLAnchorElement[];
}

const SECTIONS: readonly TabsHostTab[] = [
  { label: 'Overview', to: '/sheet', exact: true },
  { label: 'Feats', to: '/sheet/feats' },
  { label: 'Spells', to: '/sheet/spells' },
];

/** Renders the three sheet sections (Overview, Feats, Spells) with the app at `url`. */
async function render(url: string): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  const navigated = await TestBed.inject(Router).navigateByUrl(url);
  expect(navigated).toBe(true);
  const fixture = TestBed.createComponent(TabsHost);
  fixture.componentRef.setInput('label', 'Sheet sections');
  fixture.componentRef.setInput('tabs', SECTIONS);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const nav = host.querySelector('nav');
  if (nav === null) {
    throw new Error('fr-tabs rendered no <nav>');
  }
  return { fixture, nav, links: [...host.querySelectorAll('a')] };
}

function link(rendered: Rendered, index: number): HTMLAnchorElement {
  const found = rendered.links[index];
  if (found === undefined) {
    throw new Error(`No tab at ${String(index)}`);
  }
  return found;
}

/** Which tabs are marked as the current page. */
function current(rendered: Rendered): boolean[] {
  return rendered.links.map((anchor) => anchor.getAttribute('aria-current') === 'page');
}

/** Which tab is the group's Tab stop. */
function tabStops(rendered: Rendered): boolean[] {
  return rendered.links.map((anchor) => anchor.getAttribute('tabindex') === '0');
}

/** Presses `key` on the focused tab and returns the index of the tab focused after it. */
function press(rendered: Rendered, key: string): number {
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  rendered.fixture.detectChanges();
  return rendered.links.indexOf(document.activeElement as HTMLAnchorElement);
}

describe(Tabs, () => {
  it('is a navigation landmark named by its label', async () => {
    const { nav } = await render('/sheet');
    expect(nav.getAttribute('aria-label')).toBe('Sheet sections');
  });

  it('links each tab to its own route', async () => {
    const rendered = await render('/sheet');
    expect(rendered.links.map((anchor) => anchor.getAttribute('href'))).toStrictEqual([
      '/sheet',
      '/sheet/feats',
      '/sheet/spells',
    ]);
  });

  it('marks the tab of the route being shown as the current page', async () => {
    const rendered = await render('/sheet/feats');
    expect(current(rendered)).toStrictEqual([false, true, false]);
    expect([...link(rendered, 1).classList]).toStrictEqual(
      expect.arrayContaining(['underline', 'decoration-link-current', 'text-fg-default']),
    );
    expect([...link(rendered, 0).classList]).toContain('text-fg-muted');
  });

  it('marks the current tab on the routes under it', async () => {
    const rendered = await render('/sheet/spells/fireball');
    expect(current(rendered)).toStrictEqual([false, false, true]);
  });

  it('follows navigation to another section', async () => {
    const rendered = await render('/sheet');
    expect(current(rendered)).toStrictEqual([true, false, false]);
    const navigated = await TestBed.inject(Router).navigateByUrl('/sheet/spells');
    expect(navigated).toBe(true);
    await rendered.fixture.whenStable();
    expect(current(rendered)).toStrictEqual([false, false, true]);
    expect(tabStops(rendered)).toStrictEqual([false, false, true]);
  });

  it('is one Tab stop, on the current tab', async () => {
    const rendered = await render('/sheet/feats');
    expect(tabStops(rendered)).toStrictEqual([false, true, false]);
  });

  it('makes the first tab the Tab stop when no tab is current', async () => {
    const rendered = await render('/campaigns');
    expect(current(rendered)).toStrictEqual([false, false, false]);
    expect(tabStops(rendered)).toStrictEqual([true, false, false]);
  });

  it('moves focus between tabs with the arrow keys, Home and End', async () => {
    const rendered = await render('/sheet');
    link(rendered, 0).focus();
    expect(press(rendered, 'ArrowRight')).toBe(1);
    expect(press(rendered, 'ArrowRight')).toBe(2);
    expect(press(rendered, 'ArrowLeft')).toBe(1);
    expect(press(rendered, 'Home')).toBe(0);
    expect(press(rendered, 'End')).toBe(2);
  });

  it('moves focus without navigating', async () => {
    const rendered = await render('/sheet');
    link(rendered, 0).focus();
    press(rendered, 'ArrowRight');
    await rendered.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/sheet');
    expect(current(rendered)).toStrictEqual([true, false, false]);
  });

  it('takes the look of the segmented control, the current tab filled, when its appearance is segment', async () => {
    const rendered = await render('/sheet/feats');
    rendered.fixture.componentRef.setInput('appearance', TabsAppearance.Segment);
    await rendered.fixture.whenStable();

    expect([...rendered.nav.classList]).not.toContain('border-b');
    expect([...link(rendered, 1).classList]).toContain('bg-accent-solid');
    expect([...link(rendered, 0).classList]).not.toContain('bg-accent-solid');
    expect([...link(rendered, 0).classList]).not.toContain('underline');
  });

  it('puts the row in the middle when centered', async () => {
    const rendered = await render('/sheet');
    rendered.fixture.componentRef.setInput('centered', true);
    await rendered.fixture.whenStable();

    const row = rendered.nav.querySelector('div');
    expect(row?.className).toContain('mx-auto w-fit');
  });

  it('stacks the row, with the rule at its end, when vertical', async () => {
    const rendered = await render('/sheet');
    rendered.fixture.componentRef.setInput('orientation', TabsOrientation.Vertical);
    await rendered.fixture.whenStable();

    expect(rendered.nav.querySelector('div')?.className).toContain('flex-col');
    expect(rendered.nav.className).toContain('border-e');
  });

  it('moves focus with Up and Down when vertical', async () => {
    const rendered = await render('/sheet');
    rendered.fixture.componentRef.setInput('orientation', TabsOrientation.Vertical);
    await rendered.fixture.whenStable();

    link(rendered, 0).focus();
    expect(press(rendered, 'ArrowDown')).toBe(1);
    expect(press(rendered, 'ArrowDown')).toBe(2);
    expect(press(rendered, 'ArrowUp')).toBe(1);
    expect(press(rendered, 'ArrowRight')).toBe(1);
  });

  it('stays a row, with the rule under it, unless vertical', async () => {
    const rendered = await render('/sheet');

    expect(rendered.nav.querySelector('div')?.className).not.toContain('flex-col');
    expect(rendered.nav.className).not.toContain('border-e');
  });
});
