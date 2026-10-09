import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Grid } from './grid.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly grid: Element;
}

async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const fixture = TestBed.createComponent(Grid);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const grid = host.firstElementChild;
  if (grid === null) {
    throw new Error('Grid rendered no inner element');
  }
  return { host, grid };
}

describe(Grid, () => {
  it('is its own query container and stretches items by default', async () => {
    const { host, grid } = await render({});
    expect(host.className).toContain('@container');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('items-stretch');
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
});
