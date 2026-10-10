import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VirtualListHost } from '../../testing/virtual-list-host';
import { Space } from '../../tokens';
import { VirtualList } from './virtual-list.component';

/** Every row measures this tall once rendered; the default estimate (`md`) guesses 96. */
const ROW_PX = 100;
const LONG_LIST = 1000;

function creatures(count: number): string[] {
  return Array.from({ length: count }, (_slot, index) => `Creature ${index}`);
}

interface Rendered {
  readonly fixture: ComponentFixture<VirtualListHost>;
  readonly list: HTMLElement;
  readonly stable: () => Promise<void>;
}

async function render(items: readonly string[], inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(VirtualListHost);
  fixture.componentRef.setInput('items', items);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  const stable = async (): Promise<void> => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  await stable();
  const list = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('fr-virtual-list');
  if (list === null) {
    throw new Error('Expected an fr-virtual-list');
  }
  return { fixture, list, stable };
}

function rowElements(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>('[role="listitem"]')];
}

function indices(list: HTMLElement): number[] {
  return rowElements(list).map((row) => Number(row.dataset['index']));
}

/** The text of each `fr-text` in a row. */
function texts(row: HTMLElement): string[] {
  return [...row.querySelectorAll('fr-text')].map((text) => text.textContent.trim());
}

function rowShowing(list: HTMLElement, item: string): HTMLElement | undefined {
  return rowElements(list).find((row) => row.querySelector('fr-text')?.textContent.trim() === item);
}

/** The height the list reserves for every row, rendered or not. */
function totalHeight(list: HTMLElement): string | undefined {
  return list.querySelector<HTMLElement>(':scope > div')?.style.height;
}

/** Where a row sits in the list, from its transform. */
function offsetOf(row: HTMLElement): number {
  return Number(/translateY\((?<px>[\d.]+)px\)/u.exec(row.style.transform)?.groups?.['px']);
}

async function scrollPage(rendered: Rendered, top: number): Promise<void> {
  vi.spyOn(globalThis, 'scrollY', 'get').mockReturnValue(top);
  globalThis.dispatchEvent(new Event('scroll'));
  await rendered.stable();
}

describe(VirtualList, () => {
  beforeEach(() => {
    // Nothing is laid out in jsdom: every row is ROW_PX tall and the list starts at the top of the page.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(ROW_PX);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: ROW_PX, height: ROW_PX }),
    );
    vi.spyOn(globalThis, 'scrollY', 'get').mockReturnValue(0);
    // The virtualizer scrolls to keep rows still as earlier ones are measured; jsdom can't scroll.
    vi.spyOn(globalThis, 'scrollTo').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a list of list items, each rendered from the item template', async () => {
    const { list } = await render(['Goblin', 'Kobold']);
    expect(list.getAttribute('role')).toBe('list');
    expect(rowElements(list).map((row) => texts(row))).toStrictEqual([
      ['Goblin', '0'],
      ['Kobold', '1'],
    ]);
  });

  it('renders only the rows near the screen from a long list', async () => {
    const { list } = await render(creatures(LONG_LIST));
    const rendered = indices(list);
    expect(rendered[0]).toBe(0);
    expect(rendered.length).toBeGreaterThan(globalThis.innerHeight / ROW_PX);
    expect(rendered.length).toBeLessThan(LONG_LIST / 10);
  });

  it('measures rows, placing each below the measured ones and sizing the list to them', async () => {
    const { list } = await render(creatures(3));
    expect(totalHeight(list)).toBe(`${3 * ROW_PX}px`);
    expect(rowElements(list).map((row) => row.style.transform)).toStrictEqual([
      'translateY(0px)',
      `translateY(${ROW_PX}px)`,
      `translateY(${2 * ROW_PX}px)`,
    ]);
  });

  it('reserves estimated space for rows it has not rendered', async () => {
    const { list } = await render(creatures(LONG_LIST));
    const measured = indices(list).length;
    const estimated = LONG_LIST - measured;
    const MD_ESTIMATE = 96;
    expect(totalHeight(list)).toBe(`${measured * ROW_PX + estimated * MD_ESTIMATE}px`);
  });

  it('renders the rows that cover the screen as the page scrolls', async () => {
    const rendered = await render(creatures(LONG_LIST));
    const top = 50_000;
    await scrollPage(rendered, top);
    const offsets = rowElements(rendered.list).map((row) => offsetOf(row));
    expect(indices(rendered.list)).not.toContain(0);
    expect(Math.min(...offsets)).toBeLessThanOrEqual(top);
    expect(Math.max(...offsets) + ROW_PX).toBeGreaterThanOrEqual(top + globalThis.innerHeight);
    const [first] = rowElements(rendered.list);
    expect(first?.querySelector('fr-text')?.textContent.trim()).toBe(`Creature ${first?.dataset['index']}`);
  });

  it('spaces rows by the gap token', async () => {
    const { list } = await render(['Goblin'], { gap: Space.Sm });
    const [row] = rowElements(list);
    expect(row?.classList).toContain('pb-sm');
  });

  it('follows a shorter list', async () => {
    const rendered = await render(creatures(5));
    rendered.fixture.componentRef.setInput('items', creatures(2));
    await rendered.stable();
    expect(indices(rendered.list)).toStrictEqual([0, 1]);
    expect(totalHeight(rendered.list)).toBe(`${2 * ROW_PX}px`);
  });

  it('keeps a row with its item when items are inserted before it, given an itemKey', async () => {
    const rendered = await render(['Goblin', 'Kobold'], { itemKey: (item: string): string => item });
    const goblin = rowShowing(rendered.list, 'Goblin');
    rendered.fixture.componentRef.setInput('items', ['Orc', 'Goblin', 'Kobold']);
    await rendered.stable();
    expect(rowShowing(rendered.list, 'Goblin')).toBe(goblin);
  });

  it('reuses rows by position without an itemKey', async () => {
    const rendered = await render(['Goblin', 'Kobold']);
    const [first] = rowElements(rendered.list);
    rendered.fixture.componentRef.setInput('items', ['Orc', 'Goblin', 'Kobold']);
    await rendered.stable();
    expect(rowShowing(rendered.list, 'Orc')).toBe(first);
  });
});
