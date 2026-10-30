import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { SelectOption } from '@pioneer/frontier';
import type { TableColumn } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import { optionColumns, optionLabel, optionOrder, optionValue } from './option-rows';
import { PickerRows } from './picker-rows';

/** The name column of an option picker, headed in the active language. Call in an injection context. */
export function injectOptionColumns<TValue extends string>(): Signal<readonly TableColumn<SelectOption<TValue>>[]> {
  const i18n = inject(TranslocoService);
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  const messages = toSignal(merge(i18n.langChanges$, loaded));
  return computed(() => {
    messages();
    return optionColumns<TValue>(i18n.translate('rules.optionPicker.column.name'));
  });
}

/** A short fixed list as picker rows: filtered and sorted in the page, with the functions a picker reads them by. */
export interface OptionRows<TValue extends string> {
  readonly rows: PickerRows<SelectOption<TValue>>;
  readonly columns: Signal<readonly TableColumn<SelectOption<TValue>>[]>;
  readonly value: (row: SelectOption<TValue>) => TValue;
  readonly label: (row: SelectOption<TValue>) => string;
}

/** The rows of a short list the caller holds whole (ADR 0054). Call in an injection context. */
export function injectOptionRows<TValue extends string>(
  options: Signal<readonly SelectOption<TValue>[]>,
): OptionRows<TValue> {
  return {
    rows: new PickerRows(options, optionOrder<TValue>()),
    columns: injectOptionColumns<TValue>(),
    value: optionValue<TValue>,
    label: optionLabel,
  };
}
