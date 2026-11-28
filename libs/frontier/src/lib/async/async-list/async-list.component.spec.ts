import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AsyncListHost } from '../../testing/async-list-host';
import type { ComponentInputs } from '../../testing/component-inputs';
import { FakeQuery } from '../../testing/fake-query';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { AsyncList } from './async-list.component';

const PARTY = ['Valeros', 'Seoni', 'Kyra'] as const;

interface Rendered {
  readonly fixture: ComponentFixture<AsyncListHost>;
  readonly query: FakeQuery<ReadonlyArray<string>>;
  readonly list: HTMLElement;
  readonly stable: () => Promise<void>;
}

async function render(inputs: ComponentInputs<AsyncListHost> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(AsyncListHost);
  const query = new FakeQuery<ReadonlyArray<string>>();
  fixture.componentRef.setInput('query', query);

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  await fixture.whenStable();
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const list = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('fr-async-list');

  if (list === null) {
    throw new Error('Expected an fr-async-list');
  }

  return {
    fixture,
    query,
    list,
    stable: async (): Promise<void> => {
      await fixture.whenStable();
    },
  };
}

function names(list: HTMLElement): Array<string> {
  return [...list.querySelectorAll('fr-list-item fr-text')].map((text) => text.textContent.trim());
}

describe(AsyncList, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('shows item-shaped skeleton rows, and is busy, while loading', async () => {
    const { list } = await render({ skeletonRows: 4 });
    expect(list.querySelectorAll('fr-list-item fr-skeleton')).toHaveLength(4);
    expect(list.getAttribute('aria-busy')).toBe('true');
  });

  it('renders one row per item once loaded', async () => {
    const { query, list, stable } = await render();
    query.succeed(PARTY);
    await stable();
    expect(names(list)).toStrictEqual([...PARTY]);
    expect(list.querySelector('fr-skeleton')).toBeNull();
    expect(list.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows the generic failure inline when the query fails', async () => {
    const { query, list, stable } = await render();
    query.fail(new Error('500'));
    await stable();
    expect(list.querySelector('fr-alert')?.textContent.trim()).toBe('Could not load this. Try again later.');
  });

  it('shows the default empty state for no items', async () => {
    const { query, list, stable } = await render();
    query.succeed([]);
    await stable();
    expect(list.querySelector('fr-empty-state')?.textContent.trim()).toBe('Nothing here yet.');
    expect(list.querySelector('fr-list')).toBeNull();
  });

  it('shows the empty slot in place of the default', async () => {
    const { query, list, stable } = await render({ customEmpty: true });
    query.succeed([]);
    await stable();
    expect(list.textContent.trim()).toBe('Nobody yet');
  });

  it('shows no matches, with a Clear button that emits cleared, when filtered', async () => {
    const { fixture, query, list, stable } = await render({ filtered: true });
    query.succeed([]);
    await stable();
    expect(list.querySelector('fr-empty-state-title')?.textContent.trim()).toBe('Nothing matches.');
    expect(list.querySelector('fr-button button')?.textContent.trim()).toBe('Clear filters');
    list.querySelector<HTMLElement>('fr-button button')?.click();
    await stable();
    expect(fixture.componentInstance.clearCount()).toBe(1);
  });

  it('shows the filtered-empty slot in place of the default', async () => {
    const { query, list, stable } = await render({ customEmpty: true, filtered: true });
    query.succeed([]);
    await stable();
    expect(list.textContent.trim()).toBe('No one matches');
  });

  it('shows the items, not an empty state, when filtered data is not empty', async () => {
    const { query, list, stable } = await render({ filtered: true });
    query.succeed(['Seoni']);
    await stable();
    expect(names(list)).toStrictEqual(['Seoni']);
    expect(list.querySelector('fr-empty-state')).toBeNull();
  });
});
