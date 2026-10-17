import type { ValueOf } from '@pioneer/shared/kernel';

/** How a field narrows a list: `set` picks values, `range` bounds a number, `flag` is a yes or no. */
export const FilterKind = { Set: 'set', Range: 'range', Flag: 'flag' } as const;
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
  /** The values of a `set` or `flag` field; a `range` field has none. */
  readonly options?: readonly FilterOption[];
}

/**
 * One filter. `values` holds option values for a `set` or `flag` field (one for `is` and `isNot`, any number for
 * `isAnyOf`), and for a `range` field the bounds as text: one number for `is`, `[min, max]` for `between` with `''`
 * for an open end.
 */
export interface FilterCondition {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly values: readonly string[];
}

const OPERATORS: Readonly<Record<FilterKind, readonly FilterOperator[]>> = {
  set: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf],
  flag: [FilterOperator.Is, FilterOperator.IsNot],
  range: [FilterOperator.Is, FilterOperator.Between],
};

/** The operators a field of this kind offers, the default first. */
export function operatorsFor(kind: FilterKind): readonly FilterOperator[] {
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
  if (field.kind === FilterKind.Range) {
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
