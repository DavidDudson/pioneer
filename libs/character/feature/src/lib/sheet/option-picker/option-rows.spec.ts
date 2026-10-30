import type { SelectOption } from '@pioneer/frontier';
import { describe, expect, it } from 'vitest';

import { shownRows } from '../inventory/picker-rows';
import { optionColumns, optionLabel, optionOrder, optionValue } from './option-rows';

const options: readonly SelectOption<string>[] = [
  { value: 'staff', label: 'Staff of Fire' },
  { value: 'wand', label: 'Wand of Frost' },
  { value: 'rod', label: 'Rod of Wonder' },
];
const labels = (shown: readonly SelectOption<string>[]): readonly string[] => shown.map((row) => optionLabel(row));

describe(optionOrder, () => {
  it('searches the labels, whatever the case', () => {
    const shown = shownRows(options, { query: ' OF f', sort: undefined }, optionOrder());
    expect(labels(shown)).toStrictEqual(['Staff of Fire', 'Wand of Frost']);
  });

  it('sorts by the name column, either way', () => {
    const down = { column: 'name', descending: true };
    const shown = shownRows(options, { query: '', sort: down }, optionOrder());
    expect(labels(shown)).toStrictEqual(['Wand of Frost', 'Staff of Fire', 'Rod of Wonder']);
  });
});

describe(optionColumns, () => {
  it('is one name column under the header', () => {
    expect(optionColumns('Name').map((column) => column.id)).toStrictEqual(['name']);
  });
});

describe(optionValue, () => {
  it('reads the value of an option', () => {
    expect(optionValue({ value: 'rod', label: 'Rod of Wonder' })).toBe('rod');
  });
});
