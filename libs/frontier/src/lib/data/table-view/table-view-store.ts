/** Row spacing a user can pick for a table. */
export type StoredDensity = 'compact' | 'comfortable';

/** What a user chose for one table and the account keeps: the visible columns in order, and the density. */
export interface StoredTableView {
  /** The ids of the visible columns, in display order. Absent is the table's default columns. */
  readonly columns?: ReadonlyArray<string> | undefined;
  readonly density?: StoredDensity | undefined;
}

/**
 * Where a table's view is kept between visits. frontier knows no accounts: the app provides one (`TableViewStore` is
 * the token) and a table with an `entity` reads it and writes to it on every change. Without a provider nothing is
 * stored and the URL and the table's defaults are all there is.
 */
export abstract class TableViewStore {
  /** What is stored for `entity` right now; empty while loading or when nobody is signed in. */
  public abstract stored(entity: string): StoredTableView;

  /** Saves `view` as the whole preference for `entity`. Never rejects: a failed save leaves the view on screen. */
  public abstract save(entity: string, view: StoredTableView): Promise<void>;
}
