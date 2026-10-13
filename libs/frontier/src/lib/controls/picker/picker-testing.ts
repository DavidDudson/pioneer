import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';

import { tableSchema } from '../../data/table/table-schema';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Picker } from './picker.component';
import type { PickerSort } from './picker.component';

/* Shared by the picker specs. */

const VIEWPORT_PX = 220;
const ROW_PX = 44;
export const LONG_LIST = 500;
const LEVELS = 20;

export interface Feat {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  /** Why the feat can't be picked, when it can't. */
  readonly locked?: string;
}

export const FEATS: readonly Feat[] = [
  { id: 'power-attack', name: 'Power Attack', level: 1 },
  { id: 'sudden-charge', name: 'Sudden Charge', level: 1, locked: 'Needs expert in Athletics' },
  { id: 'reactive-shield', name: 'Reactive Shield', level: 2 },
];

export const COLUMNS = tableSchema<Feat>()
  .addText({ id: 'name', header: 'Name', value: (feat) => feat.name })
  .addText({ id: 'level', header: 'Level', value: (feat) => feat.level, width: 'sm' })
  .build();

/** Nothing is laid out in jsdom: give the panel's scroll container a height and every row a touch-target height. */
export function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_PX);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: VIEWPORT_PX, height: ROW_PX }),
  );
}

export function longList(): readonly Feat[] {
  return Array.from({ length: LONG_LIST }, (_entry, index) => ({
    id: `feat-${index}`,
    name: `Feat ${index + 1}`,
    level: (index % LEVELS) + 1,
  }));
}

export interface Rendered {
  readonly fixture: ComponentFixture<Picker<string, Feat>>;
  readonly host: HTMLElement;
  readonly trigger: HTMLButtonElement;
  readonly searches: string[];
  readonly sorts: (PickerSort | undefined)[];
  readonly loads: () => number;
  readonly commits: () => number;
  readonly cancels: () => number;
}

interface Outputs {
  readonly searches: string[];
  readonly sorts: (PickerSort | undefined)[];
  readonly loads: () => number;
  readonly commits: () => number;
  readonly cancels: () => number;
}

function recordOutputs(picker: Picker<string, Feat>): Outputs {
  const searches: string[] = [];
  const sorts: (PickerSort | undefined)[] = [];
  let loads = 0;
  let commits = 0;
  let cancels = 0;
  picker.searched.subscribe((query) => {
    searches.push(query);
  });
  picker.sorted.subscribe((sort) => {
    sorts.push(sort);
  });
  picker.loadMore.subscribe(() => {
    loads += 1;
  });
  picker.committed.subscribe(() => {
    commits += 1;
  });
  picker.cancelled.subscribe(() => {
    cancels += 1;
  });
  return {
    searches,
    sorts,
    loads: (): number => loads,
    commits: (): number => commits,
    cancels: (): number => cancels,
  };
}

function configure(
  fixture: ComponentFixture<Picker<string, Feat>>,
  rows: readonly Feat[],
  value: string | undefined,
): void {
  fixture.componentRef.setInput('ariaLabel', 'Feat');
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('columns', COLUMNS);
  fixture.componentRef.setInput('rowValue', (feat: Feat): string => feat.id);
  fixture.componentRef.setInput('rowLabel', (feat: Feat): string => feat.name);
  fixture.componentRef.setInput('rowDisabled', (feat: Feat): string | undefined => feat.locked);
  if (value !== undefined) {
    fixture.componentRef.setInput('value', value);
  }
}

export function render(rows: readonly Feat[] = FEATS, value?: string): Rendered {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Picker<string, Feat>);
  configure(fixture, rows, value);
  const outputs = recordOutputs(fixture.componentInstance);
  fixture.detectChanges();
  return { fixture, ...elementsOf(fixture), ...outputs };
}

interface Elements {
  readonly host: HTMLElement;
  readonly trigger: HTMLButtonElement;
}

function elementsOf(fixture: ComponentFixture<Picker<string, Feat>>): Elements {
  const host: unknown = fixture.nativeElement;
  const trigger = host instanceof HTMLElement ? (host.querySelector('button') ?? undefined) : undefined;
  if (!(host instanceof HTMLElement) || trigger === undefined) {
    throw new Error('Expected a rendered picker');
  }
  return { host, trigger };
}

export async function settle(rendered: Rendered): Promise<void> {
  rendered.fixture.detectChanges();
  await rendered.fixture.whenStable();
  rendered.fixture.detectChanges();
}

export async function open(rendered: Rendered): Promise<void> {
  rendered.trigger.click();
  await settle(rendered);
}

export function searchBox(rendered: Rendered): HTMLInputElement {
  const input = rendered.host.querySelector('input');
  if (input === null) {
    throw new Error('Expected the panel to be open');
  }
  return input;
}

export async function press(rendered: Rendered, key: string): Promise<void> {
  searchBox(rendered).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle(rendered);
}

export function type(rendered: Rendered, text: string): void {
  const input = searchBox(rendered);
  input.value = text;
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  rendered.fixture.detectChanges();
}

export function grid(rendered: Rendered): HTMLElement | null {
  return rendered.host.querySelector('[role="grid"]');
}

export function headerCells(rendered: Rendered): HTMLElement[] {
  return [...rendered.host.querySelectorAll<HTMLElement>('[role="columnheader"]')];
}

/** The press that sorts a column. */
export function sortButton(header: HTMLElement | undefined): HTMLButtonElement | undefined {
  return header?.querySelector('button') ?? undefined;
}

/** The body rows' first cells: one per row. */
export function rowCells(rendered: Rendered): HTMLElement[] {
  return [...rendered.host.querySelectorAll<HTMLElement>('fr-picker-row [role="gridcell"]')].filter(
    (cell) => cell.previousElementSibling === null,
  );
}

export function highlighted(rendered: Rendered): HTMLElement | undefined {
  const id = searchBox(rendered).getAttribute('aria-activedescendant');
  return [...rendered.host.querySelectorAll<HTMLElement>('[role="gridcell"]')].find((cell) => cell.id === id);
}

/** The text of the element a cell is described by. */
export function describedText(rendered: Rendered, cell: HTMLElement | undefined): string {
  const id = cell?.getAttribute('aria-describedby') ?? '';
  return rendered.host.querySelector(`[id="${id}"]`)?.textContent.trim() ?? '';
}

/** Each row's `aria-selected`, or `none` for a row that cannot be selected. */
export function selectedStates(rendered: Rendered): string[] {
  return rowCells(rendered).map((cell) => cell.getAttribute('aria-selected') ?? 'none');
}
