import type { SelectOption } from '@pioneer/frontier';
import type { TableColumn } from '@pioneer/frontier/data';
import { RulesTableSchema } from '@pioneer/rules/ui';

import type { RowOrder } from '../inventory/picker-rows';

/** How a short list of options is searched and sorted: by label. */
export function optionOrder<TValue extends string>(): RowOrder<SelectOption<TValue>> {
  return { text: (row) => row.label, sortKey: { name: (row) => row.label } };
}

export const optionValue = <TValue extends string>(row: SelectOption<TValue>): TValue => row.value;
export const optionLabel = (row: SelectOption<string>): string => row.label;

/** The one column of an option picker: the option's label under `header`. */
export function optionColumns<TValue extends string>(header: string): readonly TableColumn<SelectOption<TValue>>[] {
  return new RulesTableSchema<SelectOption<TValue>>()
    .addText({ id: 'name', header, value: optionLabel, width: 'md' })
    .build();
}
