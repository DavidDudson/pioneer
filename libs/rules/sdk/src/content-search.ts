import { commaList, Endpoint, HttpMethod, LocaleSchema, NoBody, NoParams, SOURCE_LOCALE } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, ContentPackId } from './content-id';
import { ContentKindSchema } from './content-kind';

const SEARCH_TEXT_LENGTH_MAX = 100;
/** Most kinds or packs one search may name; there are fewer kinds than this, and a pack list is a character's or a campaign's. */
const SEARCH_LIST_MAX = 64;
const SEARCH_LIMIT_DEFAULT = 50;
const SEARCH_LIMIT_MAX = 200;

/** What a user typed into a search box, trimmed. */
export const SearchText = z.string().trim().min(1).max(SEARCH_TEXT_LENGTH_MAX).brand<'SearchText'>();
export type SearchText = z.infer<typeof SearchText>;

/** How many results one page of a search holds. */
export const SearchLimit = z.coerce.number().int().min(1).max(SEARCH_LIMIT_MAX).brand<'SearchLimit'>();
export type SearchLimit = z.infer<typeof SearchLimit>;

/** How many results a search skips: the pages before this one. */
export const SearchOffset = z.coerce.number().int().min(0).brand<'SearchOffset'>();
export type SearchOffset = z.infer<typeof SearchOffset>;

/** How many matches a search found in all, however many a page holds. */
export const SearchTotal = z.number().int().min(0).brand<'SearchTotal'>();
export type SearchTotal = z.infer<typeof SearchTotal>;

/**
 * A content search (content-model.md, "Search"): the words, the locale they are matched in, and what to search.
 * `kinds` narrows to those kinds (none means every kind). `packs` names homebrew packs to search besides the official
 * ones; those the caller may not read are ignored, as a missing pack would be. Results come in relevance order.
 */
export const ContentSearchQuery = z.strictObject({
  query: SearchText,
  locale: LocaleSchema.default(SOURCE_LOCALE),
  kinds: commaList(ContentKindSchema, SEARCH_LIST_MAX),
  packs: commaList(ContentPackId, SEARCH_LIST_MAX),
  limit: SearchLimit.default(SearchLimit.parse(SEARCH_LIMIT_DEFAULT)),
  offset: SearchOffset.default(SearchOffset.parse(0)),
});
export type ContentSearchQuery = z.output<typeof ContentSearchQuery>;

/** One page of matches: entry ids, best first, and how many entries matched in all. */
export const ContentSearchResult = z.strictObject({
  ids: z.array(ContentId).readonly(),
  total: SearchTotal,
});
export type ContentSearchResult = z.infer<typeof ContentSearchResult>;

/**
 * Server full-text search over entry names and descriptions. Public (ADR-0007) for official content; a request that
 * also names homebrew packs is answered `private` and covers only those the signed-in caller may read.
 */
export const ContentSearchContract = {
  search: new Endpoint({
    method: HttpMethod.Get,
    path: '/content/search',
    params: NoParams,
    query: ContentSearchQuery,
    body: NoBody,
    response: ContentSearchResult,
  }),
} as const;
