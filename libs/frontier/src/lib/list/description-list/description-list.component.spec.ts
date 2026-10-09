import { ApplicationRef, createComponent, EnvironmentInjector, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Grid } from '../../layout/grid/grid.component';
import { DescriptionItem } from '../description-item/description-item.component';
import { DescriptionList } from './description-list.component';

interface Rendered {
  readonly fixture: ComponentFixture<DescriptionList>;
  readonly list: HTMLDListElement;
}

/** Renders a list and puts one `fr-description-item` per term into its `<dl>`, each with a projected value. */
async function render(inputs: Readonly<Record<string, unknown>>, terms: readonly string[]): Promise<Rendered> {
  const fixture = TestBed.createComponent(DescriptionList);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const list = (fixture.nativeElement as HTMLElement).querySelector('dl');
  if (list === null) {
    throw new Error('fr-description-list rendered no <dl>');
  }
  const appRef = TestBed.inject(ApplicationRef);
  const elementInjector = Injector.create({
    providers: [{ provide: DescriptionList, useValue: fixture.componentInstance }],
  });
  for (const term of terms) {
    const value = document.createElement('span');
    value.textContent = `${term} value`;
    const item = createComponent(DescriptionItem, {
      environmentInjector: TestBed.inject(EnvironmentInjector),
      elementInjector,
      projectableNodes: [[value]],
    });
    item.setInput('term', term);
    appRef.attachView(item.hostView);
    list.append(item.location.nativeElement as HTMLElement);
  }
  await appRef.whenStable();
  return { fixture, list };
}

/** The `<div>` grouping a row's `<dt>` and `<dd>`. */
function row(list: HTMLDListElement): HTMLElement {
  const group = list.querySelector('dt')?.parentElement;
  if (group === null || group === undefined) {
    throw new Error('fr-description-item rendered no <dt> group');
  }
  return group;
}

/** Classes in a stable order: Angular keeps a bound class list in update order, not cva order. */
function sorted(classes: string | undefined): readonly string[] {
  return (classes ?? '').split(' ').toSorted();
}

/** The inner grid's classes for these inputs, so assertions don't restate the primitive's class strings. */
async function gridClasses(inputs: Readonly<Record<string, unknown>>): Promise<string | undefined> {
  const fixture = TestBed.createComponent(Grid);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).firstElementChild?.className;
}

describe(DescriptionList, () => {
  it('renders a <dl> as a column with a token gap, inside a box the rows query', async () => {
    const { fixture, list } = await render({}, []);
    expect(list.className).toContain('flex-col');
    expect(list.className).toContain('gap-xs');
    expect((fixture.nativeElement as HTMLElement).querySelector('fr-box')?.contains(list)).toBe(true);
  });

  it('gives each item a <dt> term and a <dd> holding the projected value', async () => {
    const { list } = await render({}, ['Armor Class', 'Perception']);
    expect([...list.querySelectorAll('dt')].map((term) => term.textContent.trim())).toStrictEqual([
      'Armor Class',
      'Perception',
    ]);
    expect(list.querySelector('dd > span')?.textContent).toBe('Armor Class value');
  });

  it('groups each pair in one <div>', async () => {
    const { list } = await render({}, ['Speed']);
    const group = row(list);
    expect(group.tagName).toBe('DIV');
    expect([...group.children].map((child) => child.tagName)).toStrictEqual(['DT', 'DD']);
  });

  it('has only boxless hosts between the group and the <dl>', async () => {
    const { list } = await render({}, ['Speed']);
    const grid = row(list).parentElement;
    const item = grid?.parentElement;
    expect([grid?.tagName, item?.tagName]).toStrictEqual(['FR-GRID', 'FR-DESCRIPTION-ITEM']);
    expect([grid?.className, item?.className]).toStrictEqual(['contents', 'contents']);
    expect(item?.parentElement).toBe(list);
  });

  it('puts term and value side by side from columnsFrom, following later changes', async () => {
    const { fixture, list } = await render({}, ['Speed']);
    const shared = { query: 'parent', gap: '2xs', align: 'baseline' };
    expect(sorted(row(list).className)).toStrictEqual(sorted(await gridClasses({ ...shared, termFrom: 'sm' })));
    fixture.componentRef.setInput('columnsFrom', 'lg');
    await TestBed.inject(ApplicationRef).whenStable();
    expect(sorted(row(list).className)).toStrictEqual(sorted(await gridClasses({ ...shared, termFrom: 'lg' })));
  });
});
