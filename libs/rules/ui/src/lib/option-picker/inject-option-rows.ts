import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import type { SelectOption } from '@pioneer/frontier';
import type { TableColumn } from '@pioneer/frontier/data';

import { optionColumns, optionLabel, optionOrder, optionValue } from './option-rows';
import { PickerRows } from './picker-rows';

/** The name column of an option picker. */
export function injectOptionColumns<TValue extends string>(): Signal<ReadonlyArray<TableColumn<SelectOption<TValue>>>> {
  return computed(() => optionColumns<TValue>('rules.optionPicker.column.name'));
}

/** A short fixed list as picker rows: filtered and sorted in the page, with the functions a picker reads them by. */
export interface OptionRows<TValue extends string> {
  readonly rows: PickerRows<SelectOption<TValue>>;
  readonly columns: Signal<ReadonlyArray<TableColumn<SelectOption<TValue>>>>;
  readonly value: (row: SelectOption<TValue>) => TValue;
  readonly label: (row: SelectOption<TValue>) => string;
}

/** The rows of a short list the caller holds whole (ADR 0054). Call in an injection context. */
export function injectOptionRows<TValue extends string>(
  options: Signal<ReadonlyArray<SelectOption<TValue>>>,
): OptionRows<TValue> {
  return {
    rows: new PickerRows(options, optionOrder<TValue>()),
    columns: injectOptionColumns<TValue>(),
    value: optionValue<TValue>,
    label: optionLabel,
  };
}
