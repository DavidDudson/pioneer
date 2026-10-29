import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import { tableSchema } from '@pioneer/frontier/data';

/** One schema or entry kind to pick: its name, and the group it belongs to as a chip. */
export interface RulesPickerRow<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  readonly group: string;
}

/** The rows whose name or group hold `query`, in the order asked for; the list is short, so the page holds it all. */
export function shownRulesRows<TValue extends string>(
  rows: readonly RulesPickerRow<TValue>[],
  query: string,
  sort: PickerSort | undefined,
): readonly RulesPickerRow<TValue>[] {
  const needle = query.trim().toLocaleLowerCase();
  const matching = rows.filter((row) => `${row.label} ${row.group}`.toLocaleLowerCase().includes(needle));
  if (sort === undefined) {
    return matching;
  }
  const direction = sort.descending ? -1 : 1;
  return matching.toSorted((left, right) => {
    const order = sort.column === 'group' ? left.group.localeCompare(right.group) : 0;
    return direction * (order || left.label.localeCompare(right.label));
  });
}

/** The columns of a rules picker: the name, then its group as a chip. */
export function rulesPickerColumns<TValue extends string>(
  nameHeader: string,
  groupHeader: string,
): readonly TableColumn<RulesPickerRow<TValue>>[] {
  return tableSchema<RulesPickerRow<TValue>>()
    .addText({ id: 'name', header: nameHeader, value: (row) => row.label, width: 'md' })
    .addTag({ id: 'group', header: groupHeader, value: (row) => ({ label: row.group }), width: 'sm' })
    .build();
}

export const rulesRowValue = <TValue extends string>(row: RulesPickerRow<TValue>): TValue => row.value;
export const rulesRowLabel = <TValue extends string>(row: RulesPickerRow<TValue>): string => row.label;
