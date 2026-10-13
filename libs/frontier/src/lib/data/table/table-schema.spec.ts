import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { BadgeTone } from '../../text/badge/badge.component';
import { Tag } from '../../text/tag/tag.component';
import { TableSchema, tableSchema } from './table-schema';
import { Table } from './table.component';

interface Hero {
  readonly id: string;
  readonly name: string;
  readonly rarity: 'common' | 'rare' | 'unique';
  readonly joined: Temporal.PlainDate;
}

const HEROES: readonly Hero[] = [
  { id: 'a', name: 'Valeros', rarity: 'unique', joined: Temporal.PlainDate.from('2026-03-01') },
  { id: 'b', name: 'Kyra', rarity: 'common', joined: Temporal.PlainDate.from('2026-01-15') },
  { id: 'c', name: 'Merisiel', rarity: 'rare', joined: Temporal.PlainDate.from('2026-02-10') },
];

const RARITY_LABEL = { common: 'Common', rare: 'Rare', unique: 'Unique' } as const;
const RARITY_TONE = { common: BadgeTone.Neutral, rare: BadgeTone.Info, unique: BadgeTone.Danger } as const;
/** Sorts opposite to the label's alphabetical order, so a sort by label would be caught. */
const RARITY_ORDER = { common: 'c', rare: 'b', unique: 'a' } as const;

const SCHEMA = tableSchema<Hero>()
  .addText({ id: 'name', header: 'Name', value: (hero) => hero.name })
  .addTag({
    id: 'rarity',
    header: 'Rarity',
    value: (hero) => ({ label: RARITY_LABEL[hero.rarity], tone: RARITY_TONE[hero.rarity] }),
  })
  .addComponent({
    id: 'ranked',
    header: 'Ranked',
    sortValue: (hero) => RARITY_ORDER[hero.rarity],
    component: Tag,
    inputs: (hero) => ({ label: RARITY_ORDER[hero.rarity] }),
  })
  .addDate({ id: 'joined', header: 'Joined', value: (hero) => hero.joined });

async function render(schema: TableSchema<Hero> = SCHEMA): Promise<ComponentFixture<Table<Hero>>> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Table<Hero>);
  fixture.componentRef.setInput('data', HEROES);
  fixture.componentRef.setInput('columns', schema.build());
  fixture.componentRef.setInput('caption', 'Heroes');
  fixture.componentRef.setInput('rowId', (hero: Hero): string => hero.id);
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<Table<Hero>>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function column(fixture: ComponentFixture<Table<Hero>>, index: number): string[] {
  return [...host(fixture).querySelectorAll('tbody tr')].map(
    (row) => row.querySelectorAll('td')[index]?.textContent.trim() ?? '',
  );
}

async function sortBy(fixture: ComponentFixture<Table<Hero>>, index: number): Promise<void> {
  host(fixture).querySelectorAll('thead th')[index]?.querySelector('button')?.click();
  await fixture.whenStable();
}

describe(tableSchema, () => {
  it('builds one column per step, in chain order', () => {
    expect(SCHEMA.build().map((built) => built.id)).toStrictEqual(['name', 'rarity', 'ranked', 'joined']);
  });

  it('renders text, a tag component and a date per row', async () => {
    const fixture = await render();
    expect(column(fixture, 0)).toStrictEqual(['Valeros', 'Kyra', 'Merisiel']);
    expect(column(fixture, 1)).toStrictEqual(['Unique', 'Common', 'Rare']);
    expect(host(fixture).querySelectorAll('tbody fr-tag')).toHaveLength(HEROES.length * 2);
    expect(host(fixture).querySelectorAll('tbody time')).toHaveLength(HEROES.length);
  });

  it('sorts a component column by its sort value, not by what it renders', async () => {
    const fixture = await render();
    await sortBy(fixture, 2);
    expect(column(fixture, 0)).toStrictEqual(['Valeros', 'Merisiel', 'Kyra']);
  });

  it('sorts a date column chronologically', async () => {
    const fixture = await render();
    await sortBy(fixture, 3);
    expect(column(fixture, 0)).toStrictEqual(['Kyra', 'Merisiel', 'Valeros']);
  });

  it('turns sorting off for a column that asks', async () => {
    const schema = tableSchema<Hero>().addText({
      id: 'name',
      header: 'Name',
      value: (hero) => hero.name,
      sortable: false,
    });
    const fixture = await render(schema);
    expect(host(fixture).querySelector('thead th button')).toBeNull();
  });

  it('chains steps added by a subclass with the generic ones', async () => {
    class HeroSchema extends TableSchema<Hero> {
      public addName(): this {
        return this.addText({ id: 'name', header: 'Name', value: (hero) => hero.name });
      }
    }
    const schema = new HeroSchema().addName().addDate({ id: 'joined', header: 'Joined', value: (hero) => hero.joined });
    expect(schema).toBeInstanceOf(HeroSchema);
    expect(schema.build().map((built) => built.id)).toStrictEqual(['name', 'joined']);
  });
});
