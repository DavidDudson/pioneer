import { FilterOperator } from '../../controls/filter-bar/filter-bar.types';
import { DateDisplay } from '../../date/date.component';
import type { DateValue } from '../../date/date.component';
import { PropertyAlign, PropertyKindId } from './property.types';
import type { PropertyContext, PropertyKind } from './property.types';

/** The message keys of a yes or no, spelled out in full. */
export const BOOL_MESSAGES = {
  yes: 'frontier.property.bool.yes',
  no: 'frontier.property.bool.no',
} as const;

const TEXT_KIND: PropertyKind<string> = {
  id: PropertyKindId.Text,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf],
  compare: (left: string, right: string, context: PropertyContext): number => context.compareText(left, right),
  text: (value: string): string => value,
};

const NUMBER_KIND: PropertyKind<number> = {
  id: PropertyKindId.Number,
  align: PropertyAlign.End,
  operators: [FilterOperator.Is, FilterOperator.Between],
  compare: (left: number, right: number): number => left - right,
  text: (value: number, context: PropertyContext): string => context.formatNumber(value),
};

/** No before-or-after: `false` sorts ahead of `true`. */
function compareBool(left: boolean, right: boolean): number {
  if (left === right) {
    return 0;
  }

  return left ? 1 : -1;
}

const BOOL_KIND: PropertyKind<boolean> = {
  id: PropertyKindId.Bool,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.IsNot],
  compare: compareBool,
  text: (value: boolean, context: PropertyContext): string =>
    context.translate(value ? BOOL_MESSAGES.yes : BOOL_MESSAGES.no),
};

const DATE_KIND: PropertyKind<DateValue> = {
  id: PropertyKindId.Date,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.Between],
  cell: DateDisplay,
  // ISO strings of one kind of value sort chronologically, as `TableSchema.addDate` already relies on.
  compare: (left: DateValue, right: DateValue): number => left.toString().localeCompare(right.toString()),
  text: (value: DateValue, context: PropertyContext): string => context.formatDate(value),
};

/** The kinds frontier ships, in registry order. */
export const FRONTIER_PROPERTY_KINDS: readonly PropertyKind[] = [TEXT_KIND, NUMBER_KIND, BOOL_KIND, DATE_KIND];
