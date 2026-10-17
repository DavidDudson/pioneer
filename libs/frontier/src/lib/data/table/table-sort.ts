import type { SortingState, Updater } from '@tanstack/angular-table';

import type { TableViewSort } from '../table-view/table-view.types';

/** TanStack's sorting state for a table's sorts. */
export function toSortingState(sort: readonly TableViewSort[]): SortingState {
  return sort.map(({ column, descending }) => ({ id: column, desc: descending }));
}

/** The sorts TanStack's sorting state holds. */
function fromSortingState(state: SortingState): readonly TableViewSort[] {
  return state.map(({ id, desc }) => ({ column: id, descending: desc }));
}

/** The sorts after TanStack's change, which is either the new state or a function of the old one. */
export function sortAfter(sort: readonly TableViewSort[], updater: Updater<SortingState>): readonly TableViewSort[] {
  return fromSortingState(typeof updater === 'function' ? updater(toSortingState(sort)) : updater);
}
