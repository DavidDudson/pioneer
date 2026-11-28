import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Table } from '../table/table.component';
import { FRONTIER_PROPERTY_KINDS } from './property-kinds';
import { PropertyKindId } from './property.types';
import type { PropertyContext, PropertyDescriptor } from './property.types';
import { tableFromProperties } from './table-from-properties';
import type { TableFromPropertiesOptions } from './table-from-properties';

interface Hero {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly active: boolean;
  readonly joined: Temporal.PlainDate;
}

const HEROES: ReadonlyArray<Hero> = [
  { id: 'a', name: 'Valeros', level: 9, active: true, joined: Temporal.PlainDate.from('2026-03-01') },
  { id: 'b', name: 'Kyra', level: 10, active: false, joined: Temporal.PlainDate.from('2026-01-15') },
  { id: 'c', name: 'Merisiel', level: 2, active: true, joined: Temporal.PlainDate.from('2026-02-10') },
];

const CONTEXT: PropertyContext = {
  compareText: (left, right) => left.localeCompare(right),
  formatNumber: String,
  formatDate: (value) => value.toString(),
  translate: (key) => key,
};

const OPTIONS: TableFromPropertiesOptions = {
  kinds: new Map(FRONTIER_PROPERTY_KINDS.map((kind) => [kind.id, kind])),
  context: CONTEXT,
};

const PROPERTIES: ReadonlyArray<PropertyDescriptor<Hero>> = [
  { id: 'name', label: 'hero.name', kind: PropertyKindId.Text, value: (hero) => hero.name },
  { id: 'level', label: 'hero.level', kind: PropertyKindId.Number, value: (hero) => hero.level, code: 'lvl' },
  { id: 'active', label: 'hero.active', kind: PropertyKindId.Bool, value: (hero) => hero.active, sortable: false },
  {
    id: 'joined',
    label: 'hero.joined',
    kind: PropertyKindId.Date,
    value: (hero) => hero.joined,
    width: 'lg',
    hideable: true,
    defaultHidden: true,
  },
];

function columnIds(ids: ReadonlyArray<string>): ReadonlyArray<string | undefined> {
  return tableFromProperties(PROPERTIES, ids, OPTIONS)
    .build()
    .map((column) => column.id);
}

async function render(ids: ReadonlyArray<string>): Promise<ComponentFixture<Table<Hero>>> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Table<Hero>);
  fixture.componentRef.setInput('data', HEROES);
  fixture.componentRef.setInput('columns', tableFromProperties(PROPERTIES, ids, OPTIONS).build());
  fixture.componentRef.setInput('caption', 'Heroes');
  fixture.componentRef.setInput('rowId', (hero: Hero): string => hero.id);
  await fixture.whenStable();

  return fixture;
}

function firstColumnCells(fixture: ComponentFixture<Table<Hero>>): ReadonlyArray<string> {
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment.
  const element: HTMLElement = fixture.nativeElement;

  return [...element.querySelectorAll('tbody tr')].map((row) => row.querySelector('td, th')?.textContent.trim() ?? '');
}

describe('building columns from properties', () => {
  it('makes one column per visible id, in the order given', () => {
    expect(columnIds(['level', 'name'])).toStrictEqual(['level', 'name']);
    expect(columnIds([])).toStrictEqual([]);
  });

  it('rejects an id the list lacks, and an id listed twice', () => {
    expect(() => columnIds(['nope'])).toThrow(/No property "nope"/u);
    expect(() => columnIds(['name', 'name'])).toThrow(/listed twice/u);
  });

  it('rejects a property whose kind is not registered', () => {
    const odd: ReadonlyArray<PropertyDescriptor<Hero>> = [
      { id: 'odd', label: 'hero.odd', kind: 'unregistered', value: (hero) => hero.name },
    ];

    expect(() => tableFromProperties(odd, ['odd'], OPTIONS)).toThrow(/No property kind "unregistered"/u);
  });

  it('takes header, width, hiding and code from the property, and sorts unless told not to', () => {
    const [name, level, active, joined] = tableFromProperties(
      PROPERTIES,
      ['name', 'level', 'active', 'joined'],
      OPTIONS,
    ).build();

    expect([name?.header, name?.enableSorting, name?.meta]).toStrictEqual(['hero.name', true, undefined]);
    expect(level?.meta).toStrictEqual({ code: 'lvl' });
    expect(active?.enableSorting).toBe(false);
    expect(joined?.meta).toStrictEqual({ width: 'lg', hideable: true, defaultHidden: true });
  });

  it('renders each cell the way its kind says', async () => {
    const fixture = await render(['name', 'level']);

    expect(firstColumnCells(fixture)).toStrictEqual(['Valeros', 'Kyra', 'Merisiel']);
  });

  it('sorts by the kind: numbers by size, not by their text', async () => {
    const fixture = await render(['level', 'name']);
    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment.
    const element: HTMLElement = fixture.nativeElement;
    const sortButton = element.querySelector<HTMLElement>('thead button');
    sortButton?.click();
    await fixture.whenStable();

    expect(firstColumnCells(fixture)).toStrictEqual(['2', '9', '10']);
  });
});
