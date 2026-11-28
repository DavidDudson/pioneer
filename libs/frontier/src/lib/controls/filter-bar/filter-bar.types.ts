import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * How a field narrows a list: `set` picks values, `range` bounds a number, `flag` is a yes or no, `text` matches
 * typed text, `date` is one day or a span of days (written `2026-10-07`).
 */
export const FilterKind = { Set: 'set', Range: 'range', Flag: 'flag', Text: 'text', Date: 'date' } as const;

export type FilterKind = ValueOf<typeof FilterKind>;

export const FilterOperator = {
  Is: 'is',
  IsNot: 'isNot',
  IsAnyOf: 'isAnyOf',
  Between: 'between',
} as const;

export type FilterOperator = ValueOf<typeof FilterOperator>;

/** A value a `set` or `flag` field can take. */
export interface FilterOption {
  readonly value: string;
  /** Already translated. */
  readonly label: string;
  /** How many entries have the value, shown beside it when supplied. */
  readonly count?: number;
}

/** A thing a list can be narrowed by. */
export interface FilterField {
  readonly id: string;
  /** Already translated. */
  readonly label: string;
  readonly kind: FilterKind;
  /** The values of a `set` or `flag` field; the other kinds have none. */
  readonly options?: ReadonlyArray<FilterOption>;
  /** There are options past the loaded ones: a long `set` asks for them as its list is scrolled. */
  readonly hasMore?: boolean;
  /** The next options are loading. */
  readonly loadingMore?: boolean;
}

/** A person typed in the option search of a long `set` field: the app answers with the matching options. */
export interface FilterSearch {
  readonly field: string;
  readonly query: string;
}

/** A `set` field with this many options or fewer shows them all as a toggle group; more are searched in a list. */
export const TOGGLE_GROUP_LIMIT = 8;

/**
 * One filter. `values` holds option values for a `set` or `flag` field (one for `is` and `isNot`, any number for
 * `isAnyOf`), and for a `range` field the bounds as text: one number for `is`, `[min, max]` for `between` with `''`
 * for an open end.
 */
export interface FilterCondition {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly values: ReadonlyArray<string>;
}

const OPERATORS: Readonly<Record<FilterKind, ReadonlyArray<FilterOperator>>> = {
  set: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf],
  flag: [FilterOperator.Is, FilterOperator.IsNot],
  range: [FilterOperator.Is, FilterOperator.Between],
  text: [FilterOperator.Is, FilterOperator.IsNot],
  date: [FilterOperator.Is, FilterOperator.Between],
};

/** The operator a field of this kind starts with, and the one a link leaves unwritten. */
const DEFAULT_OPERATORS: Readonly<Record<FilterKind, FilterOperator>> = {
  set: FilterOperator.Is,
  flag: FilterOperator.Is,
  range: FilterOperator.Is,
  text: FilterOperator.Is,
  date: FilterOperator.Is,
};

/** Kinds whose `between` bounds an ordered value: a number or a day. */
export function isBounded(kind: FilterKind): boolean {
  return kind === FilterKind.Range || kind === FilterKind.Date;
}

export function defaultOperator(kind: FilterKind): FilterOperator {
  return DEFAULT_OPERATORS[kind];
}

/** The operators a field of this kind offers, the default first. */
export function operatorsFor(kind: FilterKind): ReadonlyArray<FilterOperator> {
  return OPERATORS[kind];
}

/** Each operator's message key, spelled out in full. */
export const OPERATOR_LABELS: Readonly<Record<FilterOperator, string>> = {
  is: 'frontier.filterBar.operator.is',
  isNot: 'frontier.filterBar.operator.isNot',
  isAnyOf: 'frontier.filterBar.operator.isAnyOf',
  between: 'frontier.filterBar.operator.between',
};

/** Whether a condition filters anything: it has the values its operator needs. */
export function isComplete(condition: FilterCondition): boolean {
  if (condition.operator === FilterOperator.Between) {
    return condition.values.some((bound) => bound !== '');
  }

  return condition.operator === FilterOperator.IsAnyOf
    ? condition.values.length > 0
    : condition.values[0] !== undefined && condition.values[0] !== '';
}

/** Translates a message key, filling `{name}` from `params`. */
export type Translate = (key: string, params?: Readonly<Record<string, string>>) => string;

/** The values as a person reads them: option labels, or `3 to 5`, `from 3`, `up to 5`. */
export function valueText(field: FilterField, condition: FilterCondition, translate: Translate): string {
  if (isBounded(field.kind)) {
    const [min = '', max = ''] = condition.values;

    if (condition.operator !== FilterOperator.Between) {
      return min;
    }

    if (min !== '' && max !== '') {
      return translate('frontier.filterBar.range.between', { min, max });
    }

    return min === ''
      ? translate('frontier.filterBar.range.upTo', { value: max })
      : translate('frontier.filterBar.range.from', { value: min });
  }

  const labels = new Map((field.options ?? []).map((option) => [option.value, option.label]));

  return condition.values.map((value) => labels.get(value) ?? value).join(', ');
}
