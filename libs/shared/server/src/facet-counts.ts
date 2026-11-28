import { FACET_PAGE_SIZE } from '@pioneer/shared/kernel';
import type { FacetPage } from '@pioneer/shared/kernel';
import { and, asc, count, countDistinct, desc, ilike, isNotNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

import type { Executor } from './executor';

const LIKE_WILDCARDS = /[%_\\]/gu;

/** What a facet read needs: the rows to count (`where`, the list's other conditions already applied) and the value. */
interface FacetSource {
  readonly table: PgTable;
  readonly column: PgColumn;
  readonly where: SQL | undefined;
}

/** What narrows the values: text to find in them, and the page. */
interface FacetWindow {
  readonly search?: string | undefined;
  readonly page: number;
}

/**
 * One page of the values `source.column` takes among the rows `source.where` keeps, each with its count, most common
 * first and then by value so pages are stable. Rows with no value are not counted. `search` matches the value
 * ignoring case, its own wildcards literal.
 */
export async function facetCounts(db: Executor, source: FacetSource, window: FacetWindow): Promise<FacetPage> {
  const { table, column, where } = source;
  const value = sql<string>`${column}::text`;

  const found =
    window.search === undefined
      ? undefined
      : ilike(value, `%${window.search.replaceAll(LIKE_WILDCARDS, String.raw`\$&`)}%`);

  const matching = and(where, isNotNull(column), found);

  const offset = (window.page - 1) * FACET_PAGE_SIZE;
  const byCount = [desc(count()), asc(value)];

  const [items, [counted]] = await Promise.all([
    db
      .select({ value, count: count() })
      .from(table)
      .where(matching)
      .groupBy(value)
      .orderBy(...byCount)
      .limit(FACET_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: countDistinct(column) })
      .from(table)
      .where(matching),
  ]);

  return { items, total: counted?.total ?? 0, page: window.page, pageSize: FACET_PAGE_SIZE };
}
