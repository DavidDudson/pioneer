import { Temporal } from '@pioneer/shared/kernel';

import { FilterOperator } from '../../controls/filter-bar/filter-bar.types';
import { DateDisplay } from '../../date/date.component';
import type { DateValue } from '../../date/date.component';
import { PropertyAlign, PropertyKindId } from './property.types';
import type { PropertyContext, PropertyKind } from './property.types';

/** The message keys of a yes or no, spelled out in full. */
const BOOL_MESSAGES = {
  yes: 'frontier.property.bool.yes',
  no: 'frontier.property.bool.no',
} as const;

const UTC = 'UTC';

const TEXT_KIND: PropertyKind<string> = {
  id: PropertyKindId.Text,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf],
  compare: (left: string, right: string, context: PropertyContext): number => context.compareText(left, right),
  text: (value: string): string => value,
};

/** Not `left - right`, which is `NaN` for two infinities. */
function compareNumbers(left: number, right: number): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

const NUMBER_KIND: PropertyKind<number> = {
  id: PropertyKindId.Number,
  align: PropertyAlign.End,
  operators: [FilterOperator.Is, FilterOperator.Between],
  compare: compareNumbers,
  text: (value: number, context: PropertyContext): string => context.formatNumber(value),
};

/** `false` sorts ahead of `true`. */
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

/** The moment a date value stands for; a plain date is its start in UTC. */
function toInstant(value: DateValue): Temporal.Instant {
  if (value instanceof Temporal.PlainDate) {
    return value.toZonedDateTime(UTC).toInstant();
  }

  return value instanceof Temporal.Instant ? value : value.toInstant();
}

const DATE_KIND: PropertyKind<DateValue> = {
  id: PropertyKindId.Date,
  align: PropertyAlign.Start,
  operators: [FilterOperator.Is, FilterOperator.Between],
  cell: DateDisplay,
  compare: (left: DateValue, right: DateValue): number => Temporal.Instant.compare(toInstant(left), toInstant(right)),
  text: (value: DateValue, context: PropertyContext): string => context.formatDate(value),
};

/** The kinds frontier ships, in registry order. */
export const FRONTIER_PROPERTY_KINDS: readonly PropertyKind[] = [TEXT_KIND, NUMBER_KIND, BOOL_KIND, DATE_KIND];
