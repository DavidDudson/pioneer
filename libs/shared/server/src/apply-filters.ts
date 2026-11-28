import type { FilterCondition, FilterKind, FilterOperator } from '@pioneer/shared/kernel';
import { and, between, eq, gt, gte, ilike, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/** Where a filterable property lives: its column and the kind that decides how a value is read. */
export interface FilterColumn {
  readonly column: PgColumn;
  readonly kind: FilterKind;
}

const LIKE_WILDCARDS = /[%_\\]/gu;

/** A condition's values, read as the column's kind. */
type Reader = (text: string) => string | number | boolean;

const READERS: Readonly<Record<FilterKind, Reader>> = {
  text: (text) => text,
  set: (text) => text,
  number: Number,
  flag: (text) => text === 'true',
};

/** The SQL one operator makes; `read` gives a value its kind. */
type Build = (column: PgColumn, values: ReadonlyArray<string>, read: Reader) => SQL | undefined;

const one = (values: ReadonlyArray<string>, read: Reader): string | number | boolean => read(values[0] ?? '');

/** A bound of `between` left open with `''`. */
function range(column: PgColumn, values: ReadonlyArray<string>, read: Reader): SQL | undefined {
  const [low = '', high = ''] = values;

  if (low === '') {
    return high === '' ? undefined : lte(column, read(high));
  }

  return high === '' ? gte(column, read(low)) : between(column, read(low), read(high));
}

const BUILD: Readonly<Record<FilterOperator, Build>> = {
  is: (column, values, read) => eq(column, one(values, read)),
  // A row with no value is not the value, so it stays.
  isNot: (column, values, read) => or(isNull(column), ne(column, one(values, read))),
  isAnyOf: (column, values, read) =>
    inArray(
      column,
      values.map((value) => read(value)),
    ),
  // The text is matched literally: its own `%`, `_` and `\` are escaped.
  contains: (column, values) => ilike(column, `%${(values[0] ?? '').replaceAll(LIKE_WILDCARDS, String.raw`\$&`)}%`),
  gt: (column, values, read) => gt(column, one(values, read)),
  gte: (column, values, read) => gte(column, one(values, read)),
  lt: (column, values, read) => lt(column, one(values, read)),
  lte: (column, values, read) => lte(column, one(values, read)),
  between: (column, values, read) => range(column, values, read),
};

/**
 * The SQL for `conditions`, ANDead, or `undefined` when there are none. `columns` maps each property id to its column;
 * a condition naming a property it lacks throws, since the request schema already rejected unknown ones. A mapped
 * column's `kind` must match the one the contract validated against.
 */
export function applyFilters(
  conditions: ReadonlyArray<FilterCondition>,
  columns: Readonly<Record<string, FilterColumn>>,
): SQL | undefined {
  const parts = conditions.map((condition): SQL | undefined => {
    const target = columns[condition.property];

    if (target === undefined) {
      throw new Error(`No column is mapped for the filter property ${condition.property}`);
    }

    return BUILD[condition.operator](target.column, condition.values, READERS[target.kind]);
  });

  return and(...parts);
}
