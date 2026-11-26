import { SearchTotal } from '@pioneer/rules/sdk';
import type {
  ContentId,
  ContentKind,
  ContentPackId,
  ContentSearchQuery,
  ContentSearchResult,
  SearchText,
} from '@pioneer/rules/sdk';
import { SOURCE_CONTENT_LOCALE } from '@pioneer/shared/kernel';
import type { ContentLocale } from '@pioneer/shared/kernel';
import { and, asc, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { contentEntries, contentEntrySearch, contentPacks } from './content.table';

/** The licence stored for Open Game License content, which is legacy. */
const OGL = 'OGL';

type Database = BunSQLDatabase;

/** A search to run: the caller's `ContentSearchQuery`, with `packs` cut down to the homebrew packs the caller may read. */
export interface ContentSearchCriteria extends Omit<ContentSearchQuery, 'packs'> {
  readonly packs: readonly ContentPackId[];
}

/** Full-text search over the content tables (content-model.md, "Search"); the seed writes the vectors it matches. */
export class ContentSearchRepository {
  readonly #db: Database;

  public constructor(db: Database) {
    this.#db = db;
  }

  /**
   * The entries whose name or description matches the words of `query`, best first: a hit in the name outranks one in the
   * description, and ties fall to the name and then the id so a page boundary never moves. Official packs are always
   * searched; a homebrew pack only when it is in `packs`. The words are read the way a search box is used
   * (`websearch_to_tsquery`: quotes, `or` and `-`), so no input is a syntax error.
   */
  public async search({
    query,
    locale,
    kinds,
    packs,
    legacy,
    limit,
    offset,
  }: ContentSearchCriteria): Promise<ContentSearchResult> {
    const { matched, rank } = localeMatch(locale, query);

    const matches = and(matched, kindFilter(kinds), packFilter(packs), legacyFilter(legacy));

    const [rows, [total]] = await Promise.all([
      this.#db
        .select({ id: contentEntries.id })
        .from(contentEntrySearch)
        .innerJoin(contentEntries, eq(contentEntries.id, contentEntrySearch.entryId))
        .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
        .where(matches)
        .orderBy(desc(rank), asc(contentEntries.name), asc(contentEntries.id))
        .limit(limit)
        .offset(offset),
      this.#db
        .select({ matched: count() })
        .from(contentEntrySearch)
        .innerJoin(contentEntries, eq(contentEntries.id, contentEntrySearch.entryId))
        .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
        .where(matches),
    ]);

    return { ids: rows.map(({ id }): ContentId => id), total: SearchTotal.parse(total?.matched ?? 0) };
  }
}

/** How an entry matches a search in a locale, and how well it ranks. */
interface LocaleMatch {
  readonly matched: SQL | undefined;
  readonly rank: SQL;
}

/**
 * What matches `query` in `locale`, and how well. An entry matches through its vector in the locale, which the
 * translation triggers keep with each field falling back to the entry's own; an entry with no translation in the locale
 * matches through its source-locale vector, read in the source language, so no entry drops out of a search for want
 * of a translation (content-model.md, "Search").
 */
function localeMatch(locale: ContentLocale, query: SearchText): LocaleMatch {
  const words = sql`websearch_to_tsquery(content_search_config(${locale}), ${query})`;

  if (locale === SOURCE_CONTENT_LOCALE) {
    return {
      matched: and(eq(contentEntrySearch.locale, locale), sql`${contentEntrySearch.vector} @@ ${words}`),
      rank: sql`ts_rank(${contentEntrySearch.vector}, ${words})`,
    };
  }

  const sourceWords = sql`websearch_to_tsquery(content_search_config(${SOURCE_CONTENT_LOCALE}), ${query})`;
  const translated = sql`not exists (select 1 from content_entry_search other where other.entry_id = ${contentEntrySearch.entryId} and other.locale = ${locale})`;

  return {
    matched: or(
      and(eq(contentEntrySearch.locale, locale), sql`${contentEntrySearch.vector} @@ ${words}`),
      and(
        eq(contentEntrySearch.locale, SOURCE_CONTENT_LOCALE),
        translated,
        sql`${contentEntrySearch.vector} @@ ${sourceWords}`,
      ),
    ),
    rank: sql`ts_rank(${contentEntrySearch.vector}, case when ${contentEntrySearch.locale} = ${locale} then ${words} else ${sourceWords} end)`,
  };
}

/** Every kind when none is named. */
function kindFilter(kinds: readonly ContentKind[]): SQL | undefined {
  return kinds.length === 0 ? undefined : inArray(contentEntries.kind, [...kinds]);
}

/** Official packs have no owner; a homebrew pack is searched only when named. */
function packFilter(packs: readonly ContentPackId[]): SQL | undefined {
  return packs.length === 0
    ? isNull(contentPacks.ownerId)
    : or(isNull(contentPacks.ownerId), inArray(contentPacks.id, [...packs]));
}

/**
 * Legacy content is left out unless asked for: a pack published under the Open Game License, or an entry of any pack
 * that carries that licence itself. An entry without a licence of its own has its pack's. `data` is read as text and parsed
 * again, since the driver stores it as a JSON string, on which `->>` finds nothing.
 */
function legacyFilter(legacy: boolean): SQL | undefined {
  return legacy
    ? undefined
    : sql`${contentPacks.license} <> ${OGL} and coalesce((${contentEntries.data} #>> '{}')::jsonb ->> 'license', ${contentPacks.license}) <> ${OGL}`;
}
