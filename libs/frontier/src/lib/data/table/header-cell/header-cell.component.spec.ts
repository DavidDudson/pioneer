import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { injectTable } from '@tanstack/angular-table';
import { ChevronDown, ChevronUp } from 'lucide';
import { describe, expect, it } from 'vitest';

import type { IconGlyph } from '../../../icon/icon-glyph';
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
  column.accessor('name', { header: 'member.name' }),
  column.accessor('level', { header: 'member.level', enableSorting: false }),
]);

const PARTY: ReadonlyArray<Member> = [
  { name: 'Valeros', level: 3 },
  { name: 'Kyra', level: 2 },
];

interface Rendered {
  readonly fixture: ComponentFixture<TableHeaderCell<Member>>;
  readonly host: HTMLElement;
  readonly header: TableHeader<Member>;
}

/** The two languages the specs switch between: English, and a second that spells every header differently. */
const LANGS = {
  en: { member: { name: 'Name', level: 'Level' } },
  fr: { member: { name: 'Nom', level: 'Niveau' } },
};

async function render(id: 'name' | 'level'): Promise<Rendered> {
  TestBed.configureTestingModule({
    providers: [
      importProvidersFrom(
        TranslocoTestingModule.forRoot({
          langs: LANGS,
          preloadLangs: true,
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
        }),
      ),
    ],
  });

  const table = TestBed.runInInjectionContext(() =>
    injectTable<TableFeatureSet, Member>(() => ({
      features: TABLE_FEATURES,
      columns: COLUMNS,
      data: [...PARTY],
    })),
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

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return { fixture, host: fixture.nativeElement as HTMLElement, header };
}

/** The sort arrow's drawing, so specs can tell up from down. */
function arrow(host: HTMLElement): string | undefined {
  return host.querySelector('fr-icon svg')?.innerHTML;
}

/** Presses the sort button `times` times. */
async function press({ fixture, host }: Rendered, times = 1): Promise<void> {
  for (let count = 0; count < times; count += 1) {
    host.querySelector('button')?.click();
    // oxlint-disable-next-line no-await-in-loop -- each press renders before the next
    await fixture.whenStable();
  }
}

/** How `fr-icon` draws `icon`, to compare the arrow against. */
async function drawing(icon: IconGlyph): Promise<string | undefined> {
  const fixture = TestBed.createComponent(Icon);
  fixture.componentRef.setInput('icon', icon);
  await fixture.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
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

  it('shows no arrow while unsorted', async () => {
    const { host } = await render('name');
    expect(host.querySelector('fr-icon')).toBeNull();
  });

  it('sorts ascending on a press and points the arrow up', async () => {
    const rendered = await render('name');
    await press(rendered);
    expect(rendered.header.column.getIsSorted()).toBe('asc');
    expect(arrow(rendered.host)).toBe(await drawing(ChevronUp));
  });

  it('sorts descending on a second press and points the arrow down', async () => {
    const rendered = await render('name');
    await press(rendered, 2);
    expect(rendered.header.column.getIsSorted()).toBe('desc');
    expect(arrow(rendered.host)).toBe(await drawing(ChevronDown));
  });

  it('clears the sort and the arrow on a third press', async () => {
    const rendered = await render('name');
    await press(rendered, 3);
    expect(rendered.header.column.getIsSorted()).toBe(false);
    expect(rendered.host.querySelector('fr-icon')).toBeNull();
  });

  it('translates the header key, and again when the language changes', async () => {
    const { fixture, host } = await render('name');
    expect(host.textContent.trim()).toBe('Name');

    TestBed.inject(TranslocoService).setActiveLang('fr');
    await fixture.whenStable();

    expect(host.textContent.trim()).toBe('Nom');
  });
});
