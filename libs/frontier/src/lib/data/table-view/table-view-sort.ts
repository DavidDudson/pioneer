import { MINUS } from './table-view-keys';
import { listOf, listText } from './table-view-text';
import type { TableViewColumn, TableViewSort } from './table-view.types';

/** `-lvl,name`: column codes in order, a leading `-` for descending. */
export function sortText(sort: readonly TableViewSort[], columns: readonly TableViewColumn[]): string {
  const codes = new Map(columns.map((column) => [column.id, column.code]));
  const tokens = sort.flatMap(({ column, descending }) => {
    const code = codes.get(column);
    return code === undefined ? [] : [`${descending ? MINUS : ''}${code}`];
  });
  return listText(tokens);
}

/** Sorts in the text. Unknown codes are dropped, and a column sorts once, by its first mention. */
export function sortOf(text: string | undefined, columns: readonly TableViewColumn[]): readonly TableViewSort[] {
  const ids = new Map(columns.map((column) => [column.code, column.id]));
  const seen = new Set<string>();
  const sort: TableViewSort[] = [];
  for (const token of listOf(text)) {
    const descending = token.startsWith(MINUS);
    const column = ids.get(descending ? token.slice(MINUS.length) : token);
    if (column !== undefined && !seen.has(column)) {
      seen.add(column);
      sort.push({ column, descending });
    }
  }
  return sort;
}
