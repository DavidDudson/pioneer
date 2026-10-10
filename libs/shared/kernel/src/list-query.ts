import * as z from 'zod';

import type { ValueOf } from './value-of';

export const SortDirection = { Asc: 'asc', Desc: 'desc' } as const;
export type SortDirection = ValueOf<typeof SortDirection>;

/** Schema `listQuery` builds: a defaulted sort option and direction. */
export type ListQuerySchema<TSort extends Readonly<Record<string, string>>> = z.ZodObject<{
  sort: z.ZodDefault<z.ZodEnum<TSort>>;
  direction: z.ZodDefault<z.ZodEnum<typeof SortDirection>>;
}>;

/**
 * Query schema for list endpoints. Sorting is restricted to an enumerated set
 * of options, and the object is strict, so unknown parameters (an ad-hoc
 * filter, a raw column name) are rejected rather than ignored.
 *
 * Every option must be backed by an index: the repository maps options to
 * columns with an exhaustive `Record<Option, column>`, and its database test
 * runs each option through the query-plan guard. Filters follow the same
 * rule when added: enumerated keys, each served by an index.
 */
export function listQuery<const TSort extends Readonly<Record<string, string>>>(
  sortOptions: TSort,
  defaultSort: ValueOf<TSort>,
): ListQuerySchema<TSort> {
  return z.strictObject({
    sort: z.enum(sortOptions).default(defaultSort as z.output<z.ZodEnum<TSort>>),
    direction: z.enum(SortDirection).default(SortDirection.Asc),
  });
}
