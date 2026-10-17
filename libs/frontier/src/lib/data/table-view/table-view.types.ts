/** A column as the query string knows it: its id, and the short code the URL uses in its place. */
export interface TableViewColumn {
  readonly id: string;
  /** Stable and short (`lvl`, `src`): renaming a column id must not break links, so the code is declared, not derived. */
  readonly code: string;
  /** Hidden until shown, so only showing it is worth a mention in the URL. */
  readonly defaultHidden?: boolean;
}

/** What a table's view is encoded against: its columns, and the page size that is left out of the URL. */
export interface TableViewSchema {
  readonly columns: readonly TableViewColumn[];
  readonly defaultPageSize?: number;
}

/** One sorted column; earlier entries win ties. */
export interface TableViewSort {
  readonly column: string;
  readonly descending: boolean;
}

/**
 * The state of a table worth sharing. Every part is optional, and a missing part means the default, so a default view
 * encodes to nothing.
 */
export interface TableView {
  readonly sort?: readonly TableViewSort[] | undefined;
  /** The ids of the hidden columns, as `fr-table`'s `columnVisibility`. */
  readonly hidden?: readonly string[] | undefined;
  readonly pageSize?: number | undefined;
  readonly search?: string | undefined;
  /** The facet filter state, already written by the page's facet codec: the `f` segment is opaque here. */
  readonly facets?: string | undefined;
}

/** Query params as the router holds them: a name to one value or several. Anything else under a name is ignored. */
export type TableViewQuery = Readonly<Record<string, unknown>>;

/** The params a view writes. */
export type TableViewParams = Readonly<Record<string, string>>;
