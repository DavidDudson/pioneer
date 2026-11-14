import type { ParamMap, Params } from '@angular/router';
import { CharacterPageQuery, FIRST_PAGE } from '@pioneer/character/domain';

/** The query-string keys the list's state lives under, one per filter and the page. */
const STATE_KEYS = ['minLevel', 'maxLevel', 'classId', 'ancestry', 'name', 'page'] as const;

/**
 * The list's state as the address holds it. A key that does not read (a page of "next", a level of 40) is left out, so
 * a mangled link opens the list as it is by default rather than failing.
 */
export function listStateFromParams(params: ParamMap): CharacterPageQuery {
  const kept: Record<string, string> = {};
  for (const key of STATE_KEYS) {
    const value = params.get(key);
    const reads = value !== null && CharacterPageQuery.shape[key].safeParse(value).success;
    if (reads) {
      kept[key] = value;
    }
  }
  return CharacterPageQuery.parse(kept);
}

/**
 * The query parameters for `state`: only what differs from the default list, so an unfiltered first page has none.
 * A key that is absent is `undefined`, which navigation leaves out of the address.
 */
export function paramsFromListState(state: CharacterPageQuery): Params {
  return {
    minLevel: state.minLevel,
    maxLevel: state.maxLevel,
    classId: state.classId,
    ancestry: state.ancestry,
    name: state.name,
    page: state.page === FIRST_PAGE ? undefined : state.page,
  };
}

/** Whether any filter narrows the list; the page does not. */
export function isFiltered(state: CharacterPageQuery): boolean {
  return (
    state.minLevel !== undefined ||
    state.maxLevel !== undefined ||
    state.classId !== undefined ||
    state.ancestry !== undefined ||
    state.name !== undefined
  );
}

/** How many pages `total` characters fill at `pageSize` a page; at least one, so an empty list is "page 1 of 1". */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
