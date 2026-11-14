import { AncestryId, ContentId } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { CHARACTER_NAME_MAX_LENGTH, CharacterLevel } from './character-fields';

/** A page of the character list, counted from 1. A query string carries it as text, so it is coerced. */
export const PageNumber = z.coerce.number().int().min(1).brand<'PageNumber'>();
export type PageNumber = z.infer<typeof PageNumber>;

/** How many characters a page holds. */
export const PageSize = Pg.integer().min(1).brand<'PageSize'>();
export type PageSize = z.infer<typeof PageSize>;

/** How many characters there are, across every page. */
export const CharacterCount = Pg.integer().min(0).brand<'CharacterCount'>();
export type CharacterCount = z.infer<typeof CharacterCount>;

/** The characters on a page of the list. */
export const CHARACTER_PAGE_SIZE: PageSize = PageSize.parse(24);

/** The first page. */
export const FIRST_PAGE: PageNumber = PageNumber.parse(1);

/** Text to find in a character's name, ignoring case. */
export const CharacterSearch = z.string().trim().min(1).max(CHARACTER_NAME_MAX_LENGTH).brand<'CharacterSearch'>();
export type CharacterSearch = z.infer<typeof CharacterSearch>;

/** A level in a query string, which carries it as text. */
const QueryLevel = z.coerce.number().pipe(CharacterLevel);

/**
 * What narrows the character list. Each is optional and they combine with AND: a level range (either end open),
 * the class and the ancestry picked, and text in the name. Strict, so a filter that is not here is rejected.
 */
export const CharacterFilter = z.strictObject({
  minLevel: QueryLevel.optional(),
  maxLevel: QueryLevel.optional(),
  classId: ContentId.optional(),
  ancestry: AncestryId.optional(),
  name: CharacterSearch.optional(),
});
export type CharacterFilter = z.output<typeof CharacterFilter>;

/** One page of the character list with the count behind it, so a client can say "page 2 of 5". */
export const CharacterPage = z.object({
  items: z.array(Character.codec),
  total: CharacterCount,
  page: PageNumber,
  pageSize: PageSize,
});
export type CharacterPage = z.output<typeof CharacterPage>;
