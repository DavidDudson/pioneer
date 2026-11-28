import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { FilterOperator } from '../../controls/filter-bar/filter-bar.types';
import type { FilterCondition } from '../../controls/filter-bar/filter-bar.types';
import { injectTableView } from './table-view-state';
import type { FacetTextCodec, TableViewState } from './table-view-state';
import { TableViewStore } from './table-view-store';
import type { StoredTableView } from './table-view-store';
import type { TableViewSchema } from './table-view.types';

const SCHEMA: TableViewSchema = {
  columns: [
    { id: 'name', code: 'name' },
    { id: 'level', code: 'lvl' },
    { id: 'source', code: 'src' },
  ],
};

const IS_FIRE: FilterCondition = { field: 'traits', operator: FilterOperator.Is, values: ['fire'] };

/** `traits:fire` for the one condition the tests use. */
const FACETS: FacetTextCodec = {
  encode: (filters) => filters.map((filter) => `${filter.field}:${filter.values.join('|')}`).join('~'),
  decode: (text) => (text === 'traits:fire' ? [IS_FIRE] : []),
};

interface Opened {
  readonly state: TableViewState;
  readonly router: Router;
}

async function open(url: string): Promise<Opened> {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const state = TestBed.runInInjectionContext(() => injectTableView({ schema: SCHEMA, facets: FACETS }));

  return { state, router };
}

describe('table view state', () => {
  it('reads the view from the URL', async () => {
    const { state } = await open('/list?s=-lvl,name&c=-src&q=fire&f=traits:fire&page=2');
    expect(state.sorting()).toStrictEqual([
      { column: 'level', descending: true },
      { column: 'name', descending: false },
    ]);
    expect(state.hidden()).toStrictEqual(['source']);
    expect(state.search()).toBe('fire');
    expect(state.filters()).toStrictEqual([IS_FIRE]);
  });

  it('is the default view on a URL with no table params', async () => {
    const { state } = await open('/list?page=2');
    expect(state.sorting()).toStrictEqual([]);
    expect(state.hidden()).toBeUndefined();
    expect(state.filters()).toStrictEqual([]);
    expect(state.search()).toBe('');
  });

  it('writes a change to the URL and leaves the page params alone', async () => {
    const { state, router } = await open('/list?page=2');
    await state.setSorting([{ column: 'level', descending: true }]);
    await vi.waitFor(() => {
      expect(router.url).toBe('/list?page=2&s=-lvl');
    });
    expect(state.sorting()).toStrictEqual([{ column: 'level', descending: true }]);
  });

  it('keeps the other parts of the view when one changes', async () => {
    const { state, router } = await open('/list?s=name&c=-src');
    await state.setSearch('fire');
    await vi.waitFor(() => {
      expect(router.url).toBe('/list?s=name&c=-src&q=fire');
    });
  });

  it('removes a part that goes back to the default', async () => {
    const { state, router } = await open('/list?s=name&q=fire');
    await state.setSorting([]);
    await vi.waitFor(() => {
      expect(router.url).toBe('/list?q=fire');
    });
  });

  it('writes filters through the facet codec', async () => {
    const { state, router } = await open('/list');
    await state.setFilters([IS_FIRE]);
    await vi.waitFor(() => {
      expect(decodeURIComponent(router.url)).toBe('/list?f=traits:fire');
    });
    await state.setFilters([]);
    await vi.waitFor(() => {
      expect(router.url).toBe('/list');
    });
  });

  it('writes several parts and the page params in one navigation', async () => {
    const { state, router } = await open('/list?kind=feat');
    const navigate = vi.spyOn(router, 'navigate');
    await state.apply({ search: 'fire', facets: 'traits:fire' }, { params: { kind: 'spell' } });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(router.url)).toBe('/list?kind=spell&f=traits:fire&q=fire');
  });

  it('replaces the history entry while typing a search, and pushes for everything else', async () => {
    const { state, router } = await open('/list');
    const navigate = vi.spyOn(router, 'navigate');
    await state.setSearch('fi');
    await state.setSorting([{ column: 'name', descending: false }]);
    expect(navigate.mock.calls.map(([, extras]) => extras?.replaceUrl)).toStrictEqual([true, false]);
  });
});

/** A store that keeps what it is given in memory, as the account's would between visits. */
class MemoryStore extends TableViewStore {
  public readonly saved: Array<StoredTableView> = [];
  #view: StoredTableView;

  public constructor(view: StoredTableView = {}) {
    super();
    this.#view = view;
  }

  public override stored(): StoredTableView {
    return this.#view;
  }

  public override async save(_entity: string, view: StoredTableView): Promise<void> {
    this.saved.push(view);
    this.#view = view;
  }
}

async function openStored(url: string, store: MemoryStore): Promise<TableViewState> {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', children: [] }]), { provide: TableViewStore, useValue: store }],
  });
  await TestBed.inject(Router).navigateByUrl(url);

  return TestBed.runInInjectionContext(() => injectTableView({ schema: SCHEMA, entity: 'characters' }));
}

describe('table view state with a stored view', () => {
  it('shows the stored columns when the URL names none', async () => {
    const state = await openStored('/list', new MemoryStore({ columns: ['name', 'level'], density: 'compact' }));
    expect(state.hidden()).toStrictEqual(['source']);
    expect(state.density()).toBe('compact');
  });

  it('prefers the URL columns to the stored ones', async () => {
    const state = await openStored('/list?c=-lvl', new MemoryStore({ columns: ['name', 'level'] }));
    expect(state.hidden()).toStrictEqual(['level']);
  });

  it('falls back to the table default with nothing stored and nothing in the URL', async () => {
    const state = await openStored('/list', new MemoryStore());
    expect(state.hidden()).toBeUndefined();
    expect(state.density()).toBeUndefined();
  });

  it('stores a column change as it is made, with no save step', async () => {
    const store = new MemoryStore();
    const state = await openStored('/list', store);
    await state.setHidden(['source']);
    expect(store.saved).toStrictEqual([{ columns: ['name', 'level'] }]);
  });

  it('stores a density change without touching the URL, and keeps the columns', async () => {
    const store = new MemoryStore({ columns: ['name'] });
    const state = await openStored('/list', store);
    await state.setDensity('compact');
    expect(store.saved).toStrictEqual([{ columns: ['name'], density: 'compact' }]);
    expect(TestBed.inject(Router).url).toBe('/list');
  });

  it('stores nothing for a table with no entity', async () => {
    const store = new MemoryStore();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: TableViewStore, useValue: store }],
    });
    await TestBed.inject(Router).navigateByUrl('/list');
    const state = TestBed.runInInjectionContext(() => injectTableView({ schema: SCHEMA }));
    await state.setHidden(['source']);
    expect(store.saved).toStrictEqual([]);
  });
});
