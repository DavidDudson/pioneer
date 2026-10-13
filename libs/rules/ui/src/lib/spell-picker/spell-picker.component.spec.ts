import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { spellRow } from '../testing/spell-picker-fixtures';
import type { SpellPickerRow } from './spell-picker-row';
import { SpellPicker } from './spell-picker.component';

const VIEWPORT_PX = 400;
const ROW_PX = 44;
const LONG_LIST = 300;

const ELECTRIC_ARC = spellRow({ id: 'electric-arc', name: 'Electric Arc', cantrip: true, heightenedTo: 3 });
const HYPNOTIC_PATTERN = spellRow({
  id: 'hypnotic-pattern',
  name: 'Hypnotic Pattern',
  rank: 2,
  disabledReason: 'Already picked in this entry',
});
const FIREBALL = spellRow({ id: 'fireball', name: 'Fireball', rank: 3 });
const SPELLS: readonly SpellPickerRow[] = [ELECTRIC_ARC, HYPNOTIC_PATTERN, FIREBALL];

interface Rendered {
  readonly fixture: ComponentFixture<SpellPicker>;
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

async function settle(fixture: ComponentFixture<SpellPicker>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function render(rows: readonly SpellPickerRow[], value?: string): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SpellPicker);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('ariaLabel', '3rd rank slot 1');
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
    throw new Error('Expected a rendered spell picker');
  }
  return { fixture, host, commits: (): number => commits, cancels: (): number => cancels };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function firstRow(rendered: Rendered): Element {
  const row = rendered.host.querySelector('fr-picker-row');
  if (row === null) {
    throw new Error('Expected a row');
  }
  return row;
}

function headers(rendered: Rendered): string[] {
  return [...rendered.host.querySelectorAll('[role="columnheader"]')].map((cell) => textOf(cell));
}

/** The first cell of each rendered row: a spell's name, and why it can't be picked when it can't. */
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

describe(SpellPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens straight to the table, with a column for each fact to choose by', async () => {
    const rendered = await render(SPELLS);
    expect(headers(rendered)).toStrictEqual([
      'Name',
      'Rank',
      'Traditions',
      'Cast',
      'Range',
      'Area or targets',
      'Duration',
      'Save',
      'Traits',
      'Source',
    ]);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('4');
  });

  it('says a cantrip and the rank a slot heightens it to in the rank cell', async () => {
    const rendered = await render(SPELLS);
    expect(textOf(firstRow(rendered))).toContain('Cantrip, heightened to 3rd');
  });

  it('lists every spell, one that cannot be picked included', async () => {
    const rendered = await render(SPELLS);
    expect(nameCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual([
      'Electric Arc',
      expect.stringContaining('Hypnotic Pattern') as unknown as string,
      'Fireball',
    ]);
  });

  it('disables a spell the slot cannot take and says why', async () => {
    const rendered = await render(SPELLS);
    const [, locked = document.body] = nameCells(rendered);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('Already picked in this entry');
    locked.click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.commits()).toBe(0);
  });

  it('shows the empty message when the slot offers no spells', async () => {
    const rendered = await render([]);
    expect(nameCells(rendered)).toHaveLength(0);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('searches by name', async () => {
    vi.useFakeTimers();
    const rendered = await render(SPELLS);
    search(rendered, 'fire');
    await vi.advanceTimersByTimeAsync(500);
    await settle(rendered.fixture);
    expect(nameCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual(['Fireball']);
  });

  it('picks a spell on click and commits', async () => {
    const rendered = await render(SPELLS);
    nameCells(rendered)[2]?.click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('fireball');
    expect(rendered.commits()).toBe(1);
  });

  it('picks the highlighted spell on Enter after the arrows move the highlight', async () => {
    const rendered = await render(SPELLS);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'ArrowDown');
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('fireball');
    });
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(SPELLS, 'electric-arc');
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('electric-arc');
  });

  it('renders only the rows in view of a long list', async () => {
    const rows = Array.from({ length: LONG_LIST }, (_entry, index) =>
      spellRow({ id: `spell-${index}`, name: `Spell ${index + 1}` }),
    );
    const rendered = await render(rows);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
    expect(nameCells(rendered).length).toBeLessThan(LONG_LIST);
  });
});
