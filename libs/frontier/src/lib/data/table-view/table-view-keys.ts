/** The query keys of a table view. Fixed by ADR once it lands; links in the wild depend on them. */
export const TableViewKey = {
  Sort: 's',
  Facets: 'f',
  Columns: 'c',
  PageSize: 'n',
  Search: 'q',
} as const;

export const LIST_SEPARATOR = ',';
/** Marks a descending sort (`-lvl`) and a hidden column (`-src`). */
export const MINUS = '-';
/** Marks a shown column that is hidden by default (`~src`; a `+` would read back as a space). */
export const SHOW = '~';
