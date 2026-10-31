import { SearchTotal } from '@pioneer/rules/sdk';
import type {
  ContentId,
  ContentKind,
  ContentPackId,
  ContentSearchQuery,
  ContentSearchResult,
} from '@pioneer/rules/sdk';
import { and, asc, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { contentEntries, contentEntrySearch, contentPacks } from './content.table';

/** The licence stored for Open Game License content, which is legacy. */
const OGL = 'OGL';

type Database = BunSQLDatabase<Record<string, unknown>>;

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
    const words = sql`websearch_to_tsquery(content_search_config(${locale}), ${query})`;
    const matches = and(
      eq(contentEntrySearch.locale, locale),
      sql`${contentEntrySearch.vector} @@ ${words}`,
      kindFilter(kinds),
      packFilter(packs),
      legacyFilter(legacy),
    );
    const [rows, [total]] = await Promise.all([
      this.#db
        .select({ id: contentEntries.id })
        .from(contentEntrySearch)
        .innerJoin(contentEntries, eq(contentEntries.id, contentEntrySearch.entryId))
        .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
        .where(matches)
        .orderBy(
          desc(sql`ts_rank(${contentEntrySearch.vector}, ${words})`),
          asc(contentEntries.name),
          asc(contentEntries.id),
        )
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
