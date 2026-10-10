import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Grid } from './grid.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly grid: Element;
  readonly items: readonly Element[];
}

/** Renders `fr-grid` with two spans projected and returns its host, inner element and the spans. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const items = [document.createElement('span'), document.createElement('span')];
  const component = createComponent(Grid, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [items],
  });
  onTestFinished(() => {
    component.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    component.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();
  const host = component.location.nativeElement as HTMLElement;
  const grid = host.firstElementChild;
  if (grid === null) {
    throw new Error('Grid rendered no inner element');
  }
  return { host, grid, items };
}

describe(Grid, () => {
  it('is its own query container: two stretched columns at a medium gap by default', async () => {
    const { host, grid } = await render({});
    expect(host.className).toContain('@container');
    expect([...grid.classList]).toStrictEqual(
      expect.arrayContaining(['grid-cols-1', '@md:grid-cols-2', 'gap-md', 'items-stretch']),
    );
    expect([...grid.classList]).not.toContain('@lg:grid-cols-3');
    expect([...grid.classList]).not.toContain('@lg:grid-cols-4');
  });

  it('takes no box and leaves the query to its parent container in parent mode', async () => {
    const { host } = await render({ query: 'parent' });
    expect(host.className).toBe('contents');
  });

  it('lays out a term column and a value column from termFrom, over columns and minItem', async () => {
    const { grid } = await render({ termFrom: 'md', columns: 3, minItem: 'sm', align: 'baseline' });
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('grid-cols-term');
    expect(grid.className).not.toContain('grid-cols-fill-sm');
    expect(grid.className).toContain('items-baseline');
  });

  it.each([
    [1, ['grid-cols-1'], ['@md:grid-cols-2']],
    [2, ['grid-cols-1', '@md:grid-cols-2'], ['@lg:grid-cols-3']],
    [3, ['grid-cols-1', '@md:grid-cols-2', '@lg:grid-cols-3'], []],
    [4, ['grid-cols-1', '@md:grid-cols-2', '@lg:grid-cols-4'], ['@lg:grid-cols-3']],
    [6, ['grid-cols-2', '@sm:grid-cols-3', '@lg:grid-cols-6'], ['grid-cols-1']],
  ])('steps %i columns up at its own container sizes', async (columns, present, absent) => {
    const { grid } = await render({ columns });
    expect([...grid.classList]).toStrictEqual(expect.arrayContaining(present));
    for (const name of absent) {
      expect([...grid.classList]).not.toContain(name);
    }
  });

  it('fits as many columns as the minimum item width allows, over columns', async () => {
    const { grid } = await render({ minItem: 'md', columns: 3 });
    expect([...grid.classList]).toContain('grid-cols-fill-md');
    expect([...grid.classList]).not.toContain('@lg:grid-cols-3');
  });

  it('spaces items by the gap token', async () => {
    const { grid } = await render({ gap: 'xl' });
    expect([...grid.classList]).toContain('gap-xl');
    expect([...grid.classList]).not.toContain('gap-md');
  });

  it('projects its items into the inner grid', async () => {
    const { grid, items } = await render({});
    expect(items.map((item) => item.parentElement)).toStrictEqual([grid, grid]);
  });
});
