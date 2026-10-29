import { describe, expect, it } from 'vitest';

import { shownRulesRows } from './rules-picker-table';
import type { RulesPickerRow } from './rules-picker-table';

const rows: readonly RulesPickerRow<string>[] = [
  { value: 'b', label: 'Bravo', group: 'Core' },
  { value: 'a', label: 'Alpha', group: 'Extra' },
  { value: 'c', label: 'Charlie', group: 'Core' },
];

const values = (shown: readonly RulesPickerRow<string>[]): readonly string[] => shown.map((row) => row.value);

describe(shownRulesRows, () => {
  it('keeps the given order when no sort is asked for', () => {
    expect(values(shownRulesRows(rows, '', undefined))).toStrictEqual(['b', 'a', 'c']);
  });

  it('matches the name or the group, ignoring case and surrounding space', () => {
    expect(values(shownRulesRows(rows, ' ALPHA ', undefined))).toStrictEqual(['a']);
    expect(values(shownRulesRows(rows, 'core', undefined))).toStrictEqual(['b', 'c']);
  });

  it('is empty when nothing matches', () => {
    expect(shownRulesRows(rows, 'zulu', undefined)).toStrictEqual([]);
  });

  it('orders by name, or by group with the name settling ties', () => {
    expect(values(shownRulesRows(rows, '', { column: 'name', descending: false }))).toStrictEqual(['a', 'b', 'c']);
    expect(values(shownRulesRows(rows, '', { column: 'group', descending: false }))).toStrictEqual(['b', 'c', 'a']);
    expect(values(shownRulesRows(rows, '', { column: 'group', descending: true }))).toStrictEqual(['a', 'c', 'b']);
  });
});
