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
];

const column = tableColumns<Member>();

/** Both columns can be hidden, so a test can narrow the visible ones. */
const COLUMNS: ReadonlyArray<TableColumn<Member>> = column.columns([
  column.accessor('name', { header: 'Name', meta: { hideable: true } }),
  column.accessor('level', { header: 'Level', meta: { hideable: true } }),
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

describe('Table states', () => {
  it('shows a skeleton cell for each visible column and no rows while loading', async () => {
    const { host } = await render({ loading: true });
    expect(host.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(host.querySelectorAll('tbody tr:first-child td fr-skeleton')).toHaveLength(2);
    expect(host.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelector('[role="status"]')?.textContent.trim()).toBe('Loading');
  });

  it('skeletons only the columns that are shown', async () => {
    const { host } = await render({ loading: true, columnVisibility: ['level'] });
    expect(host.querySelectorAll('tbody tr:first-child td fr-skeleton')).toHaveLength(1);
  });

  it('uses no spinner while loading', async () => {
    const { host } = await render({ loading: true });
    expect(host.querySelector('[role="progressbar"], fr-spinner')).toBeNull();
  });

  it('shows an inline error and emits retry when Retry is pressed', async () => {
    const { fixture, host } = await render({ failed: true });
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => {
      retried += 1;
    });
    expect(host.querySelector('tbody [role="alert"]')?.textContent).toContain('Could not load this');
    expect(host.querySelector('tbody td')?.getAttribute('colspan')).toBe('2');
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    expect(retried).toBe(1);
  });

  it('shows an empty state without a Clear filters button when nothing is filtered', async () => {
    const { host } = await render({ data: [] });
    expect(host.querySelector('tbody')?.textContent).toContain('Nothing here yet.');
    expect(host.querySelector('tbody button')).toBeNull();
  });

  it('offers Clear filters on a filtered empty table, which emits cleared', async () => {
    const { fixture, host } = await render({ data: [], filtered: true });
    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => {
      cleared += 1;
    });
    expect(host.querySelector('tbody')?.textContent).toContain('Nothing matches.');
    host.querySelector<HTMLButtonElement>('tbody button')?.click();
    expect(cleared).toBe(1);
  });

  it('shows the rows once loaded', async () => {
    const { host } = await render();
    expect(host.querySelector('tbody fr-skeleton')).toBeNull();
    expect(host.querySelectorAll('tbody tr td:first-child')).toHaveLength(2);
  });
});
