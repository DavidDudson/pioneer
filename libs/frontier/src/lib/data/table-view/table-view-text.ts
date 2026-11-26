import * as z from 'zod';

import { LIST_SEPARATOR } from './table-view-keys';
import type { TableViewQuery } from './table-view.types';

const NON_EMPTY_TEXT = z.string().min(1);

/** The first text under `key`: the router gives an array when a param repeats. Anything but text is `undefined`. */
export function paramText(query: TableViewQuery, key: string): string | undefined {
  const value: unknown = query[key];
  const first: unknown = Array.isArray(value) ? value[0] : value;

  const text = NON_EMPTY_TEXT.safeParse(first);

  return text.success ? text.data : undefined;
}

/** The non-empty items of a comma-separated param. */
export function listOf(text: string | undefined): readonly string[] {
  return text === undefined ? [] : text.split(LIST_SEPARATOR).filter((item) => item !== '');
}

export function listText(items: readonly string[]): string {
  return items.join(LIST_SEPARATOR);
}

/** Whole numbers above zero; anything else (`0`, `-3`, `1.5`, `abc`) is malformed. */
export function positiveInt(text: string | undefined): number | undefined {
  const value = Number(text);

  return text !== undefined && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
