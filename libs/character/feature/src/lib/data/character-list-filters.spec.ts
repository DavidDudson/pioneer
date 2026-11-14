import { convertToParamMap } from '@angular/router';
import { CharacterPageQuery, FIRST_PAGE, PageNumber } from '@pioneer/character/domain';
import { describe, expect, it } from 'vitest';

import { isFiltered, listStateFromParams, pageCount, paramsFromListState } from './character-list-filters';

const SECOND_PAGE = PageNumber.parse(2);

/** The address's parameters for `state`, as text, without the keys it leaves out. */
function addressOf(state: CharacterPageQuery): Record<string, string> {
  const written = Object.entries(paramsFromListState(state));
  const present = written.filter((entry) => entry[1] !== undefined);
  return Object.fromEntries(present.map((entry) => [entry[0], String(entry[1])]));
}

describe('the list state in the address', () => {
  it('is the first page, unfiltered, with no parameters', () => {
    const state = listStateFromParams(convertToParamMap({}));
    expect(state.page).toBe(FIRST_PAGE);
    expect(isFiltered(state)).toBe(false);
    expect(addressOf(state)).toStrictEqual({});
  });

  it('round-trips a page and every filter', () => {
    const params = { page: '2', minLevel: '3', maxLevel: '9', name: 'kyra' };
    const state = listStateFromParams(convertToParamMap(params));
    expect(state).toMatchObject({ page: SECOND_PAGE, minLevel: 3, maxLevel: 9, name: 'kyra' });
    expect(isFiltered(state)).toBe(true);
    expect(addressOf(state)).toStrictEqual(params);
  });

  it('leaves out a value that does not read, keeping the rest', () => {
    const state = listStateFromParams(convertToParamMap({ page: '0', minLevel: '40', classId: 'fighter', name: 'ka' }));
    expect(state).toMatchObject({ page: FIRST_PAGE, name: 'ka' });
    expect(state.minLevel).toBeUndefined();
    expect(state.classId).toBeUndefined();
  });

  it('writes a page only past the first', () => {
    expect(addressOf(CharacterPageQuery.parse({ page: 1 }))).toStrictEqual({});
    expect(addressOf(CharacterPageQuery.parse({ page: 2 }))).toStrictEqual({ page: '2' });
  });
});

describe('page count', () => {
  it.each([
    [0, 24, 1],
    [24, 24, 1],
    [25, 24, 2],
    [50, 24, 3],
  ])('%i characters at %i a page fill %i', (total, size, pages) => {
    expect(pageCount(total, size)).toBe(pages);
  });
});
