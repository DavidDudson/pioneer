import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { featRow } from '../testing/feat-picker-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { FeatPickerRow } from './feat-picker-row';
import { FeatPicker } from './feat-picker.component';

const VIEWPORT_PX = 400;
const ROW_PX = 44;
const LONG_LIST = 300;

const POWER_ATTACK = featRow({ id: 'power-attack', name: 'Power Attack', level: 1 });
const SUDDEN_CHARGE = featRow({
  id: 'sudden-charge',
  name: 'Sudden Charge',
  level: 1,
  disabledReason: 'Prerequisites not met',
});
const REACTIVE_SHIELD = featRow({ id: 'reactive-shield', name: 'Reactive Shield', level: 2 });
const FEATS: readonly FeatPickerRow[] = [POWER_ATTACK, SUDDEN_CHARGE, REACTIVE_SHIELD];

interface Rendered {
  readonly fixture: ComponentFixture<FeatPicker>;
  readonly host: HTMLElement;
  readonly commits: () => number;
  readonly cancels: () => number;
}

/** Nothing is laid out in jsdom: give the table's scroller a height and every row a touch-target height. */
function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_PX);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: VIEWPORT_PX, height: ROW_PX }),
  );
}

async function settle(fixture: ComponentFixture<FeatPicker>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function render(rows: readonly FeatPickerRow[], value?: string): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(FeatPicker);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('ariaLabel', 'Class feat, level 1');
  if (value !== undefined) {
    fixture.componentRef.setInput('value', value);
  }
  let commits = 0;
  let cancels = 0;
  fixture.componentInstance.committed.subscribe(() => {
    commits += 1;
  });
  fixture.componentInstance.cancelled.subscribe(() => {
    cancels += 1;
  });
  await settle(fixture);
  const host: unknown = fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new Error('Expected a rendered feat picker');
  }
  return { fixture, host, commits: (): number => commits, cancels: (): number => cancels };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function headers(rendered: Rendered): string[] {
  return [...rendered.host.querySelectorAll('[role="columnheader"]')].map((cell) => textOf(cell));
}

/** The first cell of each rendered row: a feat's name, and why it can't be picked when it can't. */
function nameCells(rendered: Rendered): HTMLElement[] {
  return [...rendered.host.querySelectorAll<HTMLElement>('fr-picker-row')].flatMap((row) => {
    const cell = row.querySelector<HTMLElement>('[role="gridcell"]');
    return cell === null ? [] : [cell];
  });
}

function searchBox(rendered: Rendered): HTMLInputElement {
  const input = rendered.host.querySelector('input');
  if (input === null) {
    throw new Error('Expected the table to be open');
  }
  return input;
}

async function press(rendered: Rendered, key: string): Promise<void> {
  searchBox(rendered).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle(rendered.fixture);
}

function search(rendered: Rendered, text: string): void {
  const input = searchBox(rendered);
  input.value = text;
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  rendered.fixture.detectChanges();
}

describe(FeatPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens straight to the table, with a column for each fact to choose by', async () => {
    const rendered = await render(FEATS);
    expect(headers(rendered)).toStrictEqual([
      'Name',
      'Level',
      'Category',
      'Actions',
      'Traits',
      'Prerequisites',
      'Source',
      'Notes',
    ]);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('4');
  });

  it('lists every feat, one that cannot be picked included', async () => {
    const rendered = await render(FEATS);
    expect(nameCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual([
      'Power Attack',
      expect.stringContaining('Sudden Charge') as unknown as string,
      'Reactive Shield',
    ]);
  });

  it('disables a feat the character cannot take and says why', async () => {
    const rendered = await render(FEATS);
    const [, locked = document.body] = nameCells(rendered);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('Prerequisites not met');
    locked.click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.commits()).toBe(0);
  });

  it('shows the empty message when the slot offers no feats', async () => {
    const rendered = await render([]);
    expect(nameCells(rendered)).toHaveLength(0);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('searches by name', async () => {
    vi.useFakeTimers();
    const rendered = await render(FEATS);
    search(rendered, 'shield');
    await vi.advanceTimersByTimeAsync(500);
    await settle(rendered.fixture);
    expect(nameCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual(['Reactive Shield']);
  });

  it('picks a feat on click and commits', async () => {
    const rendered = await render(FEATS);
    nameCells(rendered)[2]?.click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('reactive-shield');
    expect(rendered.commits()).toBe(1);
  });

  it('picks the highlighted feat on Enter after the arrows move the highlight', async () => {
    const rendered = await render(FEATS);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'ArrowDown');
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('reactive-shield');
    });
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(FEATS, 'power-attack');
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('power-attack');
  });

  it('renders only the rows in view of a long list', async () => {
    const rows = Array.from({ length: LONG_LIST }, (_entry, index) =>
      featRow({ id: `feat-${index}`, name: `Feat ${index + 1}` }),
    );
    const rendered = await render(rows);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
    expect(nameCells(rendered).length).toBeLessThan(LONG_LIST);
  });
});
