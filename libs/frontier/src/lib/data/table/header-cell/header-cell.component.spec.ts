import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import type { LucideIcon } from '@lucide/angular';
import { injectTable } from '@tanstack/angular-table';
import { describe, expect, it } from 'vitest';

import { Icon } from '../../../icon/icon.component';
import { TABLE_FEATURES, tableColumns } from '../table-features';
import type { TableFeatureSet, TableHeader } from '../table-features';
import { TableHeaderCell } from './header-cell.component';

interface Member {
  readonly name: string;
  readonly level: number;
}

const column = tableColumns<Member>();

const COLUMNS = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('level', { header: 'Level', enableSorting: false }),
]);

const PARTY: readonly Member[] = [
  { name: 'Valeros', level: 3 },
  { name: 'Kyra', level: 2 },
];

interface Rendered {
  readonly fixture: ComponentFixture<TableHeaderCell<Member>>;
  readonly host: HTMLElement;
  readonly header: TableHeader<Member>;
}

async function render(id: 'name' | 'level'): Promise<Rendered> {
  const table = TestBed.runInInjectionContext(() =>
    injectTable<TableFeatureSet, Member>(() => ({ features: TABLE_FEATURES, columns: COLUMNS, data: [...PARTY] })),
  );
  const header: TableHeader<Member> | undefined = table
    .getHeaderGroups()
    .flatMap((group) => group.headers)
    .find((candidate) => candidate.column.id === id);
  if (header === undefined) {
    throw new Error(`Expected a ${id} header`);
  }
  const fixture = TestBed.createComponent(TableHeaderCell<Member>);
  fixture.componentRef.setInput('header', header);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement, header };
}

/** The sort arrow's drawing, so specs can tell up from down. */
function arrow(host: HTMLElement): string | undefined {
  return host.querySelector('fr-icon svg')?.innerHTML;
}

/** How `fr-icon` draws `icon`, to compare the arrow against. */
async function drawing(icon: LucideIcon): Promise<string | undefined> {
  const fixture = TestBed.createComponent(Icon);
  fixture.componentRef.setInput('icon', icon);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector('svg')?.innerHTML;
}

describe(TableHeaderCell, () => {
  it('shows the header text with no button when the column does not sort', async () => {
    const { host } = await render('level');
    expect(host.textContent.trim()).toBe('Level');
    expect(host.querySelector('button')).toBeNull();
  });

  it('is a button named by the header text when the column sorts', async () => {
    const { host } = await render('name');
    expect(host.querySelector('button')?.textContent.trim()).toBe('Name');
  });

  it('shows no arrow until sorted, then up for ascending and down for descending', async () => {
    const { fixture, host, header } = await render('name');
    expect(host.querySelector('fr-icon')).toBeNull();

    host.querySelector('button')?.click();
    await fixture.whenStable();
    expect(header.column.getIsSorted()).toBe('asc');
    expect(arrow(host)).toBe(await drawing(LucideChevronUp));

    host.querySelector('button')?.click();
    await fixture.whenStable();
    expect(header.column.getIsSorted()).toBe('desc');
    expect(arrow(host)).toBe(await drawing(LucideChevronDown));

    host.querySelector('button')?.click();
    await fixture.whenStable();
    expect(header.column.getIsSorted()).toBe(false);
    expect(host.querySelector('fr-icon')).toBeNull();
  });
});
