import type * as z from 'zod';

import { CharacterListQuery } from './character-contract';
import { CharacterFilter, FIRST_PAGE, PageNumber } from './character-page';

/** What the list page holds and keeps in its address: the order, a page, and the filters a person set. */
export const CharacterListState = CharacterListQuery.extend({
  ...CharacterFilter.shape,
  page: PageNumber.default(FIRST_PAGE),
});

export type CharacterListState = z.output<typeof CharacterListState>;
