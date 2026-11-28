import * as z from 'zod';

import type { ValueOf } from './value-of';

/** What a filterable property holds, which decides the operators it accepts. */
export const FilterKind = { Text: 'text', Number: 'number', Set: 'set', Flag: 'flag' } as const;

export type FilterKind = ValueOf<typeof FilterKind>;

/** The operators on the wire. Each kind accepts a subset (`OPERATORS_BY_KIND`). */
export const FilterOperator = {
  Is: 'is',
  IsNot: 'isNot',
  IsAnyOf: 'isAnyOf',
  Contains: 'contains',
  Gt: 'gt',
  Gte: 'gte',
  Lt: 'lt',
  Lte: 'lte',
  Between: 'between',
} as const;

export type FilterOperator = ValueOf<typeof FilterOperator>;

/** The operators a property of each kind accepts; anything else is rejected, so `gt` on a text property fails. */
export const OPERATORS_BY_KIND: Readonly<Record<FilterKind, ReadonlyArray<FilterOperator>>> = {
  text: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.Contains],
  number: [
    FilterOperator.Is,
    FilterOperator.IsNot,
    FilterOperator.Gt,
    FilterOperator.Gte,
    FilterOperator.Lt,
    FilterOperator.Lte,
    FilterOperator.Between,
  ],
  set: [FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf],
  flag: [FilterOperator.Is, FilterOperator.IsNot],
};

/** The most conditions a request may carry, the most values one may hold, and the longest value. */
const MAX_CONDITIONS = 20;
const MAX_VALUES = 100;
const MAX_VALUE_LENGTH = 200;

/** Numbers on the wire are whole and fit a smallint, so a value never reaches the database out of range. */
const MIN_NUMBER = -32_768;
const MAX_NUMBER = 32_767;

/** One condition as sent: a property, an operator and its values as text. Per-entity rules come from `filterSchema`. */
export const FilterCondition = z.strictObject({
  property: z.string().min(1),
  operator: z.enum(FilterOperator),
  values: z.array(z.string().max(MAX_VALUE_LENGTH)).max(MAX_VALUES),
});

export type FilterCondition = z.output<typeof FilterCondition>;

/** The properties of one entity a list can be filtered by, each with its kind. */
export type FilterProperties<TId extends string = string> = Readonly<Record<TId, FilterKind>>;

/** How many values each operator takes. */
const ARITY: Readonly<Record<FilterOperator, { readonly min: number; readonly max: number }>> = {
  is: { min: 1, max: 1 },
  isNot: { min: 1, max: 1 },
  isAnyOf: { min: 1, max: MAX_VALUES },
  contains: { min: 1, max: 1 },
  gt: { min: 1, max: 1 },
  gte: { min: 1, max: 1 },
  lt: { min: 1, max: 1 },
  lte: { min: 1, max: 1 },
  between: { min: 2, max: 2 },
};

function arityIssue({ operator, values }: FilterCondition): string | undefined {
  const { min, max } = ARITY[operator];

  return values.length >= min && values.length <= max ? undefined : `${operator} takes ${min} to ${max} values`;
}

function isNumeric(text: string): boolean {
  const number = Number(text);

  return text.trim() !== '' && Number.isInteger(number) && number >= MIN_NUMBER && number <= MAX_NUMBER;
}

// A bound of `between` may be left open with `''`.
function numberIssue({ operator, values }: FilterCondition): string | undefined {
  const openBound = operator === FilterOperator.Between ? '' : undefined;
  const hasNonNumber = values.some((value) => value !== openBound && !isNumeric(value));

  return hasNonNumber ? 'values must be whole numbers that fit a smallint' : undefined;
}

/**
 * The first reason `condition` cannot apply to a property of `kind`, or `undefined` when it can: an operator the kind
 * lacks, the wrong number of values, or values that are not numbers on a number property.
 */
export function conditionIssue(kind: FilterKind, condition: FilterCondition): string | undefined {
  if (!OPERATORS_BY_KIND[kind].includes(condition.operator)) {
    return `operator ${condition.operator} is not allowed on a ${kind} property`;
  }

  const arity = arityIssue(condition);

  if (arity !== undefined) {
    return arity;
  }

  return kind === FilterKind.Number ? numberIssue(condition) : undefined;
}

/**
 * The schema of an entity's `FilterCondition[]`: each condition names one of `properties`, uses an operator its kind
 * accepts and has values that fit. Unknown properties and operators are rejected, never ignored.
 */
export function filterSchema(properties: FilterProperties): z.ZodArray<typeof FilterCondition> {
  const known = new Map<string, FilterKind>(Object.entries(properties));

  const condition = FilterCondition.superRefine((value, context) => {
    const kind = known.get(value.property);

    if (kind === undefined) {
      context.addIssue({ code: 'custom', path: ['property'], message: `unknown property ${value.property}` });

      return;
    }

    const issue = conditionIssue(kind, value);

    if (issue !== undefined) {
      context.addIssue({ code: 'custom', message: issue });
    }
  });

  return z.array(condition).max(MAX_CONDITIONS);
}

const Json = z.codec(z.string(), z.json(), {
  decode: (text, context): z.core.util.JSONType => {
    try {
      const json = z.json().safeParse(JSON.parse(text));

      if (json.success) {
        return json.data;
      }
    } catch {
      // Falls through to the issue below, the same as a value that is not JSON.
    }

    context.issues.push({ code: 'custom', input: text, message: 'filters must be JSON' });

    return z.NEVER;
  },
  encode: (value): string => JSON.stringify(value),
});

/**
 * A query-string value holding conditions as JSON (`filters=[{"property":"level","operator":"gte","values":["3"]}]`).
 * Absent means none. Unreadable JSON is rejected.
 */
export function filtersParam(
  properties: FilterProperties,
): z.ZodDefault<z.ZodPipe<typeof Json, z.ZodArray<typeof FilterCondition>>> {
  return Json.pipe(filterSchema(properties)).default([]);
}

/** What a stored value is compared as. */
export type FilterValue = string | number | boolean | undefined;

type Holds<TValue> = (actual: TValue, values: ReadonlyArray<string>) => boolean;

const first = (values: ReadonlyArray<string>): string => values[0] ?? '';

/** Text and sets compare as text; only the operators their kinds accept can hold. */
const TEXT_HOLDS: Readonly<Record<FilterOperator, Holds<string | undefined>>> = {
  is: (actual, values) => actual === first(values),
  isNot: (actual, values) => actual !== first(values),
  isAnyOf: (actual, values) => actual !== undefined && values.includes(actual),
  contains: (actual, values) => actual?.toLowerCase().includes(first(values).toLowerCase()) === true,
  gt: () => false,
  gte: () => false,
  lt: () => false,
  lte: () => false,
  between: () => false,
};

/** An open bound (`''`) reaches to infinity. */
function bound(text: string | undefined, open: number): number {
  return text === undefined || text === '' ? open : Number(text);
}

const NUMBER_HOLDS: Readonly<Record<FilterOperator, Holds<number>>> = {
  is: (actual, values) => actual === Number(first(values)),
  isNot: (actual, values) => actual !== Number(first(values)),
  isAnyOf: () => false,
  contains: () => false,
  gt: (actual, values) => actual > Number(first(values)),
  gte: (actual, values) => actual >= Number(first(values)),
  lt: (actual, values) => actual < Number(first(values)),
  lte: (actual, values) => actual <= Number(first(values)),
  between: (actual, values) =>
    actual >= bound(values[0], Number.NEGATIVE_INFINITY) && actual <= bound(values[1], Number.POSITIVE_INFINITY),
};

/** Whether `actual` satisfies `condition`; text compares ignoring case for `contains`, numbers numerically. */
export function conditionHolds(kind: FilterKind, condition: FilterCondition, actual: FilterValue): boolean {
  if (kind === FilterKind.Number) {
    return actual !== undefined && NUMBER_HOLDS[condition.operator](Number(actual), condition.values);
  }

  return TEXT_HOLDS[condition.operator](actual === undefined ? undefined : String(actual), condition.values);
}
