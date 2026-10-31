import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { RichText } from '@pioneer/rules/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deityRow } from '../testing/deity-picker-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { DeityPickerRow } from './deity-picker-row';
import { DeityPicker } from './deity-picker.component';

const VIEWPORT_PX = 400;
const ROW_PX = 44;
const LONG_LIST = 300;

const NO_DEITY = deityRow({
  id: '',
  name: 'No deity',
  sanctification: undefined,
  fonts: [],
  domains: [],
  favoredWeapons: [],
  skills: [],
  description: RichText.parse([]),
  sources: [],
});
const SARENRAE = deityRow({ id: 'sarenrae', name: 'Sarenrae', domains: ['fire', 'healing', 'sun', 'truth'] });
const KALISTRADE = deityRow({
  id: 'kalistrade',
  name: 'Prophecies of Kalistrade',
  sanctification: undefined,
  fonts: [],
  domains: [],
  disabledReason: 'A cleric needs a deity with a divine font',
});
const ZON_KUTHON = deityRow({
  id: 'zon-kuthon',
  name: 'Zon-Kuthon',
  sanctification: { modal: 'can', what: ['unholy'] },
  fonts: ['harm'],
  domains: ['darkness', 'pain'],
});
const DEITIES: readonly DeityPickerRow[] = [NO_DEITY, SARENRAE, KALISTRADE, ZON_KUTHON];

interface Rendered {
  readonly fixture: ComponentFixture<DeityPicker>;
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

async function settle(fixture: ComponentFixture<DeityPicker>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function render(rows: readonly DeityPickerRow[], value?: string): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(DeityPicker);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('ariaLabel', 'Deity');
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
    throw new TypeError('Expected a rendered deity picker');
  }
  return { fixture, host, commits: (): number => commits, cancels: (): number => cancels };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The facts the Sarenrae fixture shows across its cells. */
const SARENRAE_FACTS = [
  'Can be holy',
  'Heal',
  'Healing',
  'Scimitar',
  'Medicine',
  'Edicts protect allies',
  'Anathema create undead',
];

function rowAt(rendered: Rendered, index: number): Element {
  const row = [...rendered.host.querySelectorAll('fr-picker-row')].at(index);
  if (row === undefined) {
    throw new Error(`Expected row ${index}`);
  }
  return row;
}

function headers(rendered: Rendered): string[] {
  return [...rendered.host.querySelectorAll('[role="columnheader"]')].map((cell) => textOf(cell));
}

/** The first cell of each rendered row: a deity's name, and why it can't be picked when it can't. */
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

function cellAt(rendered: Rendered, index: number): HTMLElement {
  const cell = nameCells(rendered).at(index);
  if (cell === undefined) {
    throw new Error(`Expected cell ${index}`);
  }
  return cell;
}

function search(rendered: Rendered, text: string): void {
  const input = searchBox(rendered);
  input.value = text;
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  rendered.fixture.detectChanges();
}

describe(DeityPicker, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens straight to the table, with a column for each fact to choose by', async () => {
    const rendered = await render(DEITIES);
    expect(headers(rendered)).toStrictEqual([
      'Name',
      'Sanctification',
      'Divine font',
      'Domains',
      'Favored weapon',
      'Divine skill',
      'Edicts and anathema',
      'Source',
    ]);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('5');
  });

  it('shows what a deity grants and how its followers live in rich cells', async () => {
    const rendered = await render(DEITIES);
    const text = textOf(rowAt(rendered, 1));
    const missing = SARENRAE_FACTS.filter((fact) => !text.includes(fact));
    expect(missing).toStrictEqual([]);
  });

  it('lists every deity, one that cannot be picked included', async () => {
    const rendered = await render(DEITIES);
    expect(nameCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual([
      'No deity',
      'Sarenrae',
      expect.stringContaining('Prophecies of Kalistrade') as unknown as string,
      'Zon-Kuthon',
    ]);
  });

  it('disables a deity the character cannot follow and says why', async () => {
    const rendered = await render(DEITIES);
    const locked = cellAt(rendered, 2);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(textOf(locked)).toContain('A cleric needs a deity with a divine font');
    locked.click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBeUndefined();
    expect(rendered.commits()).toBe(0);
  });

  it('shows the empty message when the slot offers no deities', async () => {
    const rendered = await render([]);
    expect(nameCells(rendered)).toHaveLength(0);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1');
  });

  it('searches by name', async () => {
    vi.useFakeTimers();
    const rendered = await render(DEITIES);
    search(rendered, 'kuth');
    await vi.advanceTimersByTimeAsync(500);
    await settle(rendered.fixture);
    expect(nameCells(rendered).map((cell) => cell.textContent.trim())).toStrictEqual(['Zon-Kuthon']);
  });

  it('picks a deity on click and commits', async () => {
    const rendered = await render(DEITIES);
    nameCells(rendered)[3]?.click();
    await settle(rendered.fixture);
    expect(rendered.fixture.componentInstance.value()).toBe('zon-kuthon');
    expect(rendered.commits()).toBe(1);
  });

  it('picks the highlighted deity on Enter after the arrows move the highlight', async () => {
    const rendered = await render(DEITIES);
    await press(rendered, 'ArrowDown');
    await press(rendered, 'Enter');
    await vi.waitFor(() => {
      expect(rendered.fixture.componentInstance.value()).toBe('sarenrae');
    });
    expect(rendered.commits()).toBe(1);
  });

  it('cancels on Escape and keeps the previous pick', async () => {
    const rendered = await render(DEITIES, 'sarenrae');
    await press(rendered, 'Escape');
    expect(rendered.cancels()).toBe(1);
    expect(rendered.fixture.componentInstance.value()).toBe('sarenrae');
  });

  it('renders only the rows in view of a long list', async () => {
    const rows = Array.from({ length: LONG_LIST }, (_entry, index) =>
      deityRow({ id: `deity-${index}`, name: `Deity ${index + 1}` }),
    );
    const rendered = await render(rows);
    expect(rendered.host.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(LONG_LIST + 1));
    expect(nameCells(rendered).length).toBeLessThan(LONG_LIST);
  });
});
