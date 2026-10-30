import { describe, expect, it } from 'vitest';

import { shownRows } from './picker-rows';
import type { RowOrder } from './picker-rows';

interface Row {
  readonly name: string;
  readonly size: number;
}

const rows: readonly Row[] = [
  { name: 'Backpack', size: 4 },
  { name: 'Satchel', size: 10 },
  { name: 'Belt pouch', size: 4 },
];
const order: RowOrder<Row> = {
  text: (row) => row.name,
  sortKey: { name: (row) => row.name, size: (row) => row.size },
};
const names = (shown: readonly Row[]): readonly string[] => shown.map((row) => row.name);

describe(shownRows, () => {
  it('keeps the given order when no sort is asked for', () => {
    expect(names(shownRows(rows, { query: '', sort: undefined }, order))).toStrictEqual([
      'Backpack',
      'Satchel',
      'Belt pouch',
    ]);
  });

  it('matches the text, ignoring case and surrounding space, and can match nothing', () => {
    expect(names(shownRows(rows, { query: ' POUCH ', sort: undefined }, order))).toStrictEqual(['Belt pouch']);
    expect(shownRows(rows, { query: 'chest', sort: undefined }, order)).toStrictEqual([]);
  });

  it('orders numbers as numbers, with the text settling ties', () => {
    expect(names(shownRows(rows, { query: '', sort: { column: 'size', descending: false } }, order))).toStrictEqual([
      'Backpack',
      'Belt pouch',
      'Satchel',
    ]);
    expect(names(shownRows(rows, { query: '', sort: { column: 'size', descending: true } }, order))).toStrictEqual([
      'Satchel',
      'Belt pouch',
      'Backpack',
    ]);
  });

  it('ignores a column that has no sort key', () => {
    expect(names(shownRows(rows, { query: '', sort: { column: 'nope', descending: false } }, order))).toStrictEqual([
      'Backpack',
      'Satchel',
      'Belt pouch',
    ]);
  });
});
