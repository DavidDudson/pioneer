import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TabListHost } from '../../testing/tab-list-host';

interface Rendered {
  readonly fixture: ComponentFixture<TabListHost>;
  readonly tabs: readonly HTMLButtonElement[];
}

async function render(): Promise<Rendered> {
  const fixture = TestBed.createComponent(TabListHost);
  await fixture.whenStable();
  const tabs = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
  return { fixture, tabs };
}

function key(target: HTMLElement, name: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
}

describe('fr-tab-list', () => {
  it('is a labelled tablist of tabs with the chosen one selected', async () => {
    const { fixture, tabs } = await render();
    const list = (fixture.nativeElement as HTMLElement).querySelector('[role="tablist"]');
    expect(list?.getAttribute('aria-label')).toBe('Kinds of action');
    expect(tabs.map((tab) => tab.getAttribute('role'))).toStrictEqual(['tab', 'tab', 'tab']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toStrictEqual(['false', 'true', 'false']);
  });

  it('is one Tab stop, on the chosen tab', async () => {
    const { tabs } = await render();
    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toStrictEqual(['-1', '0', '-1']);
  });

  it('moves focus with the arrow keys, Home and End, without choosing', async () => {
    const { fixture, tabs } = await render();
    const [first, second, third] = tabs;
    second?.focus();
    key(second as HTMLElement, 'ArrowRight');
    expect(document.activeElement).toBe(third);
    key(third as HTMLElement, 'Home');
    expect(document.activeElement).toBe(first);
    key(first as HTMLElement, 'End');
    expect(document.activeElement).toBe(third);
    await fixture.whenStable();
    expect(fixture.componentInstance.chosen()).toBe('spells');
  });

  it('chooses the tab that is pressed', async () => {
    const { fixture, tabs } = await render();
    tabs[2]?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.chosen()).toBe('items');
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');
  });
});
