import { defaultOperator, FilterKind, FilterOperator, isBounded, operatorsFor } from './filter-bar.types';
import type { FilterCondition, FilterField } from './filter-bar.types';

/** Between conditions: `traits:fire~traits:!evil~level:1..5`. */
const CONDITION_SEPARATOR = '~';

/** Between a field's id and its values. */
const FIELD_SEPARATOR = ':';

/** Between a condition's values. */
const VALUE_SEPARATOR = ',';

/** Before an excluded value, the `is not` operator: `traits:!evil`. */
const EXCLUDE_MARK = '!';

/** Between a range's bounds, either of which may be left out: `level:1..5`, `level:..3`. */
const RANGE_SEPARATOR = '..';

/** The characters the text uses itself, each written as a `%` code inside a value. `%` is first: it is escaped first. */
const ESCAPES = [
  ['%', '%25'],
  ['~', '%7E'],
  [',', '%2C'],
  [':', '%3A'],
  ['!', '%21'],
] as const;

function escapeValue(value: string): string {
  let text = value;

  for (const [character, code] of ESCAPES) {
    text = text.replaceAll(character, code);
  }

  return text;
}

/** Undoes `escapeValue`, `%` last so `%257E` reads as the text `%7E`, not as `~`. */
function unescapeValue(value: string): string {
  let text = value;

  for (const [character, code] of ESCAPES.toReversed()) {
    text = text.replaceAll(code, character);
  }

  return text;
}

/** A number written the way `String` writes it, so `1e3`, `0x10`, `3.0` and ` 3` are not bounds. */
function isNumber(text: string): boolean {
  return text !== '' && String(Number(text)) === text;
}

/** A day written `2026-10-07`, as a date box gives it. */
const DAY = /^\d{4}-\d{2}-\d{2}$/v;

/** A bound of this kind of field: a number for `range`, a day for `date`. */
function isValue(kind: FilterKind, text: string): boolean {
  return kind === FilterKind.Date ? DAY.test(text) : isNumber(text);
}

function isBound(kind: FilterKind, side: string): boolean {
  return side === '' || isValue(kind, side);
}

function valuesText(condition: FilterCondition): string {
  const mark = condition.operator === FilterOperator.IsNot ? EXCLUDE_MARK : '';
  const given = condition.values.filter((value) => value !== '');

  return given.map((value) => `${mark}${escapeValue(value)}`).join(VALUE_SEPARATOR);
}

function rangeText(field: FilterField, condition: FilterCondition): string {
  const [min = '', max = ''] = condition.values;

  if (condition.operator === FilterOperator.Between) {
    return isBound(field.kind, min) && isBound(field.kind, max) && (min !== '' || max !== '')
      ? `${min}${RANGE_SEPARATOR}${max}`
      : '';
  }

  return condition.operator === defaultOperator(field.kind) && isValue(field.kind, min) ? min : '';
}

function conditionText(field: FilterField, condition: FilterCondition): string | undefined {
  const offered = operatorsFor(field.kind).includes(condition.operator);
  const values = isBounded(field.kind) ? rangeText(field, condition) : valuesText(condition);

  return offered && values !== '' ? `${condition.field}${FIELD_SEPARATOR}${values}` : undefined;
}

function rangeConditions(field: FilterField, body: string): Array<FilterCondition> {
  if (!body.includes(RANGE_SEPARATOR)) {
    return isValue(field.kind, body)
      ? [{ field: field.id, operator: defaultOperator(field.kind), values: [body] }]
      : [];
  }

  const [min, max, ...rest] = body.split(RANGE_SEPARATOR);

  const readable =
    min !== undefined && max !== undefined && rest.length === 0 && isBound(field.kind, min) && isBound(field.kind, max);

  return readable && (min !== '' || max !== '')
    ? [{ field: field.id, operator: FilterOperator.Between, values: [min, max] }]
    : [];
}

/** The operator for several included values, or `undefined` when the field can only take one. */
function includeOperator(field: FilterField, count: number): FilterOperator | undefined {
  const operator = count === 1 ? defaultOperator(field.kind) : FilterOperator.IsAnyOf;

  return operatorsFor(field.kind).includes(operator) ? operator : undefined;
}

function valueConditions(field: FilterField, body: string): Array<FilterCondition> {
  const tokens = body.split(VALUE_SEPARATOR).filter((token) => token !== '');
  const include = tokens.filter((token) => !token.startsWith(EXCLUDE_MARK)).map((token) => unescapeValue(token));

  const exclude = tokens
    .filter((token) => token.startsWith(EXCLUDE_MARK))
    .map((token) => unescapeValue(token.slice(EXCLUDE_MARK.length)))
    .filter((value) => value !== '');

  const operator = includeOperator(field, include.length);

  const included: Array<FilterCondition> =
    include.length === 0 || operator === undefined ? [] : [{ field: field.id, operator, values: include }];

  const excluded = exclude.map((value): FilterCondition => ({
    field: field.id,
    operator: FilterOperator.IsNot,
    values: [value],
  }));

  return [...included, ...excluded];
}

function segmentConditions(fields: ReadonlyMap<string, FilterField>, segment: string): Array<FilterCondition> {
  const separatorIndex = segment.indexOf(FIELD_SEPARATOR);
  const field = separatorIndex < 1 ? undefined : fields.get(segment.slice(0, separatorIndex));

  if (field === undefined) {
    return [];
  }

  const body = segment.slice(separatorIndex + FIELD_SEPARATOR.length);

  return isBounded(field.kind) ? rangeConditions(field, body) : valueConditions(field, body);
}

/**
 * Filter conditions as link text: `<field>:<values>` joined by `~`, e.g. `traits:fire~traits:!evil~level:1..5`. The
 * default operator is left unwritten (bare values, a bare number); `!` marks `is not` and `..` joins `between`'s
 * bounds. Values holding `~`, `,`, `:`, `!` or `%` are written with a `%` code.
 */
export interface FilterCodec {
  /**
   * Conditions of unknown fields, with an operator the field lacks, or with no usable value are left out. A written
   * shape reads back as its canonical equivalent: `is any of` one value is `is`, and each `is not` value its own.
   */
  readonly encode: (conditions: ReadonlyArray<FilterCondition>) => string;
  /** Segments that do not read are dropped, never thrown on, so an old or edited link still opens. */
  readonly decode: (text: string) => ReadonlyArray<FilterCondition>;
}

/** The codec for the fields `getFields` gives, read on each call so it follows a page whose fields change. */
export function filterCodec(getFields: () => ReadonlyArray<FilterField>): FilterCodec {
  const fieldsById = (): ReadonlyMap<string, FilterField> => new Map(getFields().map((field) => [field.id, field]));

  return {
    encode: (conditions) => {
      const known = fieldsById();

      return conditions
        .flatMap((condition): Array<string> => {
          const field = known.get(condition.field);
          const text = field === undefined ? undefined : conditionText(field, condition);

          return text === undefined ? [] : [text];
        })
        .join(CONDITION_SEPARATOR);
    },
    decode: (text) => {
      const known = fieldsById();

      return text.split(CONDITION_SEPARATOR).flatMap((segment) => segmentConditions(known, segment));
    },
  };
}
