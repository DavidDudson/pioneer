import { hiddenOf, columnsText } from './table-view-columns';
import { TableViewKey } from './table-view-keys';
import { sortOf, sortText } from './table-view-sort';
import { paramText, positiveInt } from './table-view-text';
import type { TableView, TableViewParams, TableViewQuery, TableViewSchema } from './table-view.types';

/** A typical view (a few sorts, a few columns toggled, a short search) stays under this many characters of query. */
export const TYPICAL_VIEW_LENGTH = 200;

/** Params for the parts of `view` that are not the default; a part left out reads back as the default. */
function entries(view: TableView, schema: TableViewSchema): readonly (readonly [string, string])[] {
  const { columns } = schema;
  const pageSize = view.pageSize === schema.defaultPageSize ? undefined : view.pageSize;
  return [
    [TableViewKey.Sort, sortText(view.sort ?? [], columns)],
    [TableViewKey.Facets, view.facets ?? ''],
    [TableViewKey.Columns, view.hidden === undefined ? '' : columnsText(view.hidden, columns)],
    [TableViewKey.PageSize, pageSize === undefined ? '' : String(pageSize)],
    [TableViewKey.Search, view.search ?? ''],
  ];
}

/**
 * The query params for `view`: short keys, column codes in place of ids, and nothing for a part that is the default,
 * so one view always gives one URL and a default view gives none.
 */
export function encodeTableView(view: TableView, schema: TableViewSchema): TableViewParams {
  return Object.fromEntries(entries(view, schema).filter(([, text]) => text !== ''));
}

/**
 * The view in `query`. Params that aren't the table's are someone else's and are ignored; parts that don't read are
 * dropped rather than failing, so an old or hand-edited link still opens.
 */
export function decodeTableView(query: TableViewQuery, schema: TableViewSchema): TableView {
  const sort = sortOf(paramText(query, TableViewKey.Sort), schema.columns);
  const columns = paramText(query, TableViewKey.Columns);
  const pageSize = positiveInt(paramText(query, TableViewKey.PageSize));
  const search = paramText(query, TableViewKey.Search);
  const facets = paramText(query, TableViewKey.Facets);
  return {
    ...(sort.length === 0 ? {} : { sort }),
    ...(columns === undefined ? {} : { hidden: hiddenOf(columns, schema.columns) }),
    ...(pageSize === undefined ? {} : { pageSize }),
    ...(search === undefined ? {} : { search }),
    ...(facets === undefined ? {} : { facets }),
  };
}
