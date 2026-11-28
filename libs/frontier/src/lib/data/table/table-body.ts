import type { ValueOf } from '@pioneer/shared/kernel';

/** What a table's body shows. */
export const TableBody = { Loading: 'loading', Failed: 'failed', Empty: 'empty', Rows: 'rows' } as const;

export type TableBody = ValueOf<typeof TableBody>;

const SKELETON_ROW_COUNT = 5;

/** The placeholder rows shown while the first rows load. */
export const SKELETON_ROWS: ReadonlyArray<number> = Array.from({ length: SKELETON_ROW_COUNT }).map(
  (_empty, row) => row,
);
