import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { tableColumns } from './table-features';
import type { TableColumn } from './table-features';
import { Table } from './table.component';

interface Member {
  readonly id: string;
  readonly name: string;
  readonly level: number;
}

const PARTY: ReadonlyArray<Member> = [
  { id: 'valeros', name: 'Valeros', level: 3 },
  { id: 'kyra', name: 'Kyra', level: 2 },
  { id: 'merisiel', name: 'Merisiel', level: 4 },
];

/** Two names and one level tie, so a second sort column decides their order. */
const TIED: ReadonlyArray<Member> = [
  { id: 'a', name: 'Zed', level: 2 },
  { id: 'b', name: 'Amy', level: 2 },
  { id: 'c', name: 'Bo', level: 1 },
];

const column = tableColumns<Member>();

const COLUMNS: ReadonlyArray<TableColumn<Member>> = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('level', { header: 'Level' }),
]);

interface Rendered {
  readonly fixture: ComponentFixture<Table<Member>>;
  readonly host: HTMLElement;
}

async function render(inputs: ComponentInputs<Table<Member>> = {}): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Table<Member>);
  fixture.componentRef.setInput('data', PARTY);
  fixture.componentRef.setInput('columns', COLUMNS);
  fixture.componentRef.setInput('caption', 'Party');

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  await fixture.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function headers(host: HTMLElement): Array<HTMLTableCellElement> {
  return [...host.querySelectorAll<HTMLTableCellElement>('thead th')];
}

/** The Name column, top to bottom. */
function names(host: HTMLElement): Array<string> {
  return [...host.querySelectorAll('tbody tr td:first-child')].map((cell) => cell.textContent.trim());
}

/** Presses the header at `index`, with Shift held or not. */
async function press({ fixture, host }: Rendered, index: number, shiftKey: boolean): Promise<void> {
  const button = headers(host)[index]?.querySelector('button');
  button?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey }));
  await fixture.whenStable();
}

/** The *Load more* button, which sits after the table's scroller. */
function loadMoreButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(':scope > div > fr-button button');
}

/** Counts `loadMore` emissions. */
function countLoadMore({ fixture }: Rendered): () => number {
  let count = 0;
  fixture.componentInstance.loadMore.subscribe(() => {
    count += 1;
  });

  return () => count;
}

describe('Table for a server list', () => {
  describe('multi-sort', () => {
    // A number sorts largest first.
    it('adds a column to the sort when Shift is held', async () => {
      const rendered = await render({ data: TIED });
      await press(rendered, 1, false);
      await press(rendered, 0, true);
      expect(rendered.fixture.componentInstance.sorting()).toStrictEqual([
        { column: 'level', descending: true },
        { column: 'name', descending: false },
      ]);
      expect(names(rendered.host)).toStrictEqual(['Amy', 'Zed', 'Bo']);
    });

    it('replaces the sort on a press without Shift', async () => {
      const rendered = await render({ data: TIED });
      await press(rendered, 1, false);
      await press(rendered, 0, false);
      expect(rendered.fixture.componentInstance.sorting()).toStrictEqual([{ column: 'name', descending: false }]);
    });

    it('numbers the sorted columns once there are several, and not before', async () => {
      const rendered = await render({ data: TIED });
      await press(rendered, 1, false);
      expect(headers(rendered.host)[1]?.querySelector('span')?.textContent.trim()).toBe('');
      await press(rendered, 0, true);
      expect(headers(rendered.host).map((header) => header.querySelector('span')?.textContent.trim())).toStrictEqual([
        '2',
        '1',
      ]);
    });
  });

  describe('manual sorting', () => {
    it('reports a sort without reordering the rows', async () => {
      const rendered = await render({ manualSorting: true });
      await press(rendered, 0, false);
      expect(rendered.fixture.componentInstance.sorting()).toStrictEqual([{ column: 'name', descending: false }]);
      expect(headers(rendered.host)[0]?.getAttribute('aria-sort')).toBe('ascending');
      expect(names(rendered.host)).toStrictEqual(['Valeros', 'Kyra', 'Merisiel']);
    });
  });

  describe('load more', () => {
    it('hides the button without more rows', async () => {
      const { host } = await render();
      expect(loadMoreButton(host)?.closest('.hidden')).not.toBeNull();
    });

    it('emits loadMore when the button is pressed', async () => {
      const rendered = await render({ hasMore: true });
      const requests = countLoadMore(rendered);
      expect(loadMoreButton(rendered.host)?.textContent.trim()).toBe('Load more');
      loadMoreButton(rendered.host)?.click();
      expect(requests()).toBe(1);
    });

    it('is busy and says so while the next rows load', async () => {
      const rendered = await render({ hasMore: true, loadingMore: true });
      const requests = countLoadMore(rendered);
      const button = loadMoreButton(rendered.host);
      expect(button?.getAttribute('aria-busy')).toBe('true');
      expect(button?.textContent.trim()).toBe('Loading more');
      expect(rendered.host.querySelector('[role="status"]')?.textContent.trim()).toBe('Loading more');
      button?.click();
      expect(requests()).toBe(0);
    });
  });

  describe('sticky header and first column', () => {
    it('pins nothing by default', async () => {
      const { host } = await render();
      expect(host.querySelector('.sticky')).toBeNull();
    });

    it('pins the header row and gives the table a height to scroll in', async () => {
      const { host } = await render({ stickyHeader: true });
      expect(headers(host).every((header) => header.classList.contains('sticky'))).toBe(true);
      expect(host.querySelector('td.sticky')).toBeNull();
      expect(host.querySelector('table')?.parentElement?.className).toContain('max-h-picker');
    });

    it('pins the first column, header cell and cells', async () => {
      const { host } = await render({ stickyFirstColumn: true });
      expect(headers(host).map((header) => header.classList.contains('sticky'))).toStrictEqual([true, false]);
      expect(
        [...host.querySelectorAll('tbody tr')].map((row) => row.querySelector('td')?.classList.contains('sticky')),
      ).toStrictEqual([true, true, true]);
      expect(host.querySelector('td:nth-child(2)')?.classList.contains('sticky')).toBe(false);
    });

    it('keeps the corner over both when both are pinned', async () => {
      const { host } = await render({ stickyHeader: true, stickyFirstColumn: true });
      expect(headers(host).map((header) => header.classList.contains('z-overlay'))).toStrictEqual([true, false]);
    });
  });
});
