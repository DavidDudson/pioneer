import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { tableColumns } from './table-features';
import type { TableColumn } from './table-features';
import { Table } from './table.component';

interface Member {
  readonly id: string;
  readonly name: string;
  readonly level: number;
}

const PARTY: readonly Member[] = [
  { id: 'valeros', name: 'Valeros', level: 3 },
  { id: 'kyra', name: 'Kyra', level: 2 },
  { id: 'merisiel', name: 'Merisiel', level: 4 },
];

const column = tableColumns<Member>();

const COLUMNS: readonly TableColumn<Member>[] = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('level', { header: 'Level', enableSorting: false }),
]);

/** Both columns can be hidden, so the table has a *Columns* panel. */
const HIDEABLE: readonly TableColumn<Member>[] = column.columns([
  column.accessor('name', { header: 'Name', meta: { hideable: true } }),
  column.accessor('level', { header: 'Level', meta: { hideable: true } }),
]);

interface Rendered {
  readonly fixture: ComponentFixture<Table<Member>>;
  readonly host: HTMLElement;
}

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Table<Member>);
  fixture.componentRef.setInput('data', PARTY);
  fixture.componentRef.setInput('columns', COLUMNS);
  fixture.componentRef.setInput('caption', 'Party');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function headers(host: HTMLElement): HTMLTableCellElement[] {
  return [...host.querySelectorAll<HTMLTableCellElement>('thead th')];
}

function nameHeader(host: HTMLElement): HTMLTableCellElement {
  const [header] = headers(host);
  if (header === undefined) {
    throw new Error('Expected a Name header');
  }
  return header;
}

/** Each body row's cell text, in order. */
function rows(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim()),
  );
}

/** The Name column, top to bottom. */
function names(host: HTMLElement): string[] {
  return [...host.querySelectorAll('tbody tr td:first-child')].map((cell) => cell.textContent.trim());
}

/** Presses the Name header `times` times. */
async function sortByName({ fixture, host }: Rendered, times = 1): Promise<void> {
  for (let press = 0; press < times; press += 1) {
    nameHeader(host).querySelector('button')?.click();
    // oxlint-disable-next-line no-await-in-loop -- each press renders before the next
    await fixture.whenStable();
  }
}

function toggles(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll<HTMLButtonElement>('fr-toggle-button button')];
}

function toggle(host: HTMLElement, label: string): HTMLButtonElement {
  const found = toggles(host).find((button) => button.textContent.trim() === label);
  if (found === undefined) {
    throw new Error(`Expected a ${label} toggle`);
  }
  return found;
}

function reset(host: HTMLElement): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>('fr-disclosure fr-button button')].at(-1);
  if (found === undefined) {
    throw new Error('Expected a reset button');
  }
  return found;
}

async function renderHideable(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  return render({ columns: HIDEABLE, ...inputs });
}

describe(Table, () => {
  it('renders a semantic table named by its caption', async () => {
    const { host } = await render();
    const table = host.querySelector('table');
    expect(table?.querySelector(':scope > caption')?.textContent.trim()).toBe('Party');
    expect(headers(host).map((header) => header.getAttribute('scope'))).toStrictEqual(['col', 'col']);
    expect(headers(host).map((header) => header.textContent.trim())).toStrictEqual(['Name', 'Level']);
  });

  it('renders one row per item in data order, a cell per column', async () => {
    const { host } = await render();
    expect(rows(host)).toStrictEqual([
      ['Valeros', '3'],
      ['Kyra', '2'],
      ['Merisiel', '4'],
    ]);
  });

  it('hides the caption visually but keeps it as the name', async () => {
    const { host } = await render({ hideCaption: true });
    const caption = host.querySelector('caption');
    expect(caption?.textContent.trim()).toBe('Party');
    expect(caption?.classList).toContain('sr-only');
  });

  it('renders a header row and an empty body with no data', async () => {
    const { host } = await render({ data: [] });
    expect(headers(host)).toHaveLength(2);
    expect(rows(host)).toStrictEqual([]);
  });

  it('follows new data', async () => {
    const { fixture, host } = await render();
    fixture.componentRef.setInput('data', [{ id: 'seoni', name: 'Seoni', level: 3 }]);
    await fixture.whenStable();
    expect(rows(host)).toStrictEqual([['Seoni', '3']]);
  });

  it('marks no column as sorted at first', async () => {
    const { host } = await render();
    expect(headers(host).map((header) => header.hasAttribute('aria-sort'))).toStrictEqual([false, false]);
  });

  it('sorts ascending on the first press of a header', async () => {
    const rendered = await render();
    await sortByName(rendered);
    expect(nameHeader(rendered.host).getAttribute('aria-sort')).toBe('ascending');
    expect(names(rendered.host)).toStrictEqual(['Kyra', 'Merisiel', 'Valeros']);
  });

  it('sorts descending on the second press', async () => {
    const rendered = await render();
    await sortByName(rendered, 2);
    expect(nameHeader(rendered.host).getAttribute('aria-sort')).toBe('descending');
    expect(names(rendered.host)).toStrictEqual(['Valeros', 'Merisiel', 'Kyra']);
  });

  it('goes back to data order on the third press', async () => {
    const rendered = await render();
    await sortByName(rendered, 3);
    expect(nameHeader(rendered.host).hasAttribute('aria-sort')).toBe(false);
    expect(names(rendered.host)).toStrictEqual(['Valeros', 'Kyra', 'Merisiel']);
  });

  it('keeps a sort when data changes', async () => {
    const rendered = await render();
    await sortByName(rendered);
    rendered.fixture.componentRef.setInput('data', [...PARTY, { id: 'amiri', name: 'Amiri', level: 1 }]);
    await rendered.fixture.whenStable();
    expect(names(rendered.host)).toStrictEqual(['Amiri', 'Kyra', 'Merisiel', 'Valeros']);
  });

  describe('column visibility', () => {
    it('has no Columns panel when no column can be hidden', async () => {
      const { host } = await render();
      expect(host.querySelector('fr-column-chooser details')).toBeNull();
    });

    it('lists every column as a pressed toggle', async () => {
      const { host } = await renderHideable();
      expect(
        toggles(host).map((button) => [button.textContent.trim(), button.getAttribute('aria-pressed')]),
      ).toStrictEqual([
        ['Name', 'true'],
        ['Level', 'true'],
      ]);
    });

    it('hides a column and reports the hidden ids', async () => {
      const { fixture, host } = await renderHideable();
      toggle(host, 'Level').click();
      await fixture.whenStable();
      expect(headers(host).map((header) => header.textContent.trim())).toStrictEqual(['Name']);
      expect(rows(host)).toStrictEqual([['Valeros'], ['Kyra'], ['Merisiel']]);
      expect(fixture.componentInstance.columnVisibility()).toStrictEqual(['level']);
    });

    it('shows a hidden column again', async () => {
      const { fixture, host } = await renderHideable();
      toggle(host, 'Level').click();
      await fixture.whenStable();
      toggle(host, 'Level').click();
      await fixture.whenStable();
      expect(headers(host)).toHaveLength(2);
      expect(fixture.componentInstance.columnVisibility()).toStrictEqual([]);
    });

    it('takes hidden columns from the model', async () => {
      const { host } = await renderHideable({ columnVisibility: ['name'] });
      expect(headers(host).map((header) => header.textContent.trim())).toStrictEqual(['Level']);
    });

    it('starts without a column its schema marks defaultHidden, and reset returns to that', async () => {
      const hiddenColumns: readonly TableColumn<Member>[] = column.columns([
        column.accessor('name', { header: 'Name' }),
        column.accessor('level', { header: 'Level', meta: { defaultHidden: true } }),
      ]);
      const { fixture, host } = await render({ columns: hiddenColumns });
      expect(headers(host)).toHaveLength(1);
      toggle(host, 'Level').click();
      await fixture.whenStable();
      expect(headers(host)).toHaveLength(2);
      reset(host).click();
      await fixture.whenStable();
      expect(headers(host)).toHaveLength(1);
      expect(fixture.componentInstance.columnVisibility()).toBeUndefined();
    });

    it('resets to every column shown', async () => {
      const { fixture, host } = await renderHideable({ columnVisibility: ['level'] });
      expect(reset(host).disabled).toBe(false);
      reset(host).click();
      await fixture.whenStable();
      expect(headers(host)).toHaveLength(2);
    });

    it('keeps the last visible column on: its toggle is disabled and the model cannot hide it', async () => {
      const { fixture, host } = await renderHideable({ columnVisibility: ['level'] });
      expect(toggle(host, 'Name').disabled).toBe(true);
      fixture.componentRef.setInput('columnVisibility', ['name', 'level']);
      await fixture.whenStable();
      expect(headers(host)).toHaveLength(2);
    });

    it('offers no toggle for a column that is not hideable', async () => {
      const pinned: readonly TableColumn<Member>[] = column.columns([
        column.accessor('name', { header: 'Name' }),
        column.accessor('level', { header: 'Level', meta: { hideable: true } }),
      ]);
      const { host } = await render({ columns: pinned, columnVisibility: ['name', 'level'] });
      expect(toggles(host).map((button) => button.textContent.trim())).toStrictEqual(['Level']);
      expect(headers(host).map((header) => header.textContent.trim())).toStrictEqual(['Name']);
    });

    it('ignores ids that are not columns', async () => {
      const { host } = await renderHideable({ columnVisibility: ['ghost'] });
      expect(headers(host)).toHaveLength(2);
    });
  });
});
