import { MINUS, SHOW } from './table-view-keys';
import { listOf, listText } from './table-view-text';
import type { TableViewColumn } from './table-view.types';

function defaultHiddenIds(columns: readonly TableViewColumn[]): readonly string[] {
  return columns.filter((column) => column.defaultHidden === true).map((column) => column.id);
}

/**
 * `-src,~bk`: only the columns that differ from the defaults, in schema order. `-` hides a column shown by default
 * and `+` shows one hidden by default.
 */
export function columnsText(hidden: readonly string[], columns: readonly TableViewColumn[]): string {
  const wanted = new Set(hidden);
  const tokens = columns.flatMap((column) => {
    const isHidden = wanted.has(column.id);
    if (isHidden === (column.defaultHidden === true)) {
      return [];
    }
    return [`${isHidden ? MINUS : SHOW}${column.code}`];
  });
  return listText(tokens);
}

/** The ids of the hidden columns after the text's changes to the defaults. Unknown codes and bare codes are dropped. */
export function hiddenOf(text: string, columns: readonly TableViewColumn[]): readonly string[] {
  const ids = new Map(columns.map((column) => [column.code, column.id]));
  const hidden = new Set(defaultHiddenIds(columns));
  for (const token of listOf(text)) {
    const id = ids.get(token.slice(1));
    if (id !== undefined && token.startsWith(MINUS)) {
      hidden.add(id);
    } else if (id !== undefined && token.startsWith(SHOW)) {
      hidden.delete(id);
    }
  }
  return columns.map((column) => column.id).filter((id) => hidden.has(id));
}
