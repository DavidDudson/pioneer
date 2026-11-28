import { FilterKind, FilterOperator, operatorsFor } from './filter-bar.types';
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

/** A plain number, as the bounds of a range read. */
function isNumber(text: string): boolean {
  return text.trim() !== '' && Number.isFinite(Number(text));
}

function isBound(side: string): boolean {
  return side === '' || isNumber(side);
}

function valuesText(condition: FilterCondition): string {
  const mark = condition.operator === FilterOperator.IsNot ? EXCLUDE_MARK : '';

  return condition.values.map((value) => `${mark}${escapeValue(value)}`).join(VALUE_SEPARATOR);
}

function rangeText(condition: FilterCondition): string {
  const [min = '', max = ''] = condition.values;

  if (condition.operator === FilterOperator.Between) {
    return `${min}${RANGE_SEPARATOR}${max}`;
  }

  return min;
}

function conditionText(field: FilterField, condition: FilterCondition): string | undefined {
  const offered = operatorsFor(field.kind).includes(condition.operator);
  const values = field.kind === FilterKind.Range ? rangeText(condition) : valuesText(condition);

  if (!offered || values === '' || values === RANGE_SEPARATOR) {
    return undefined;
  }

  return `${condition.field}${FIELD_SEPARATOR}${values}`;
}

function rangeConditions(field: FilterField, body: string): Array<FilterCondition> {
  if (!body.includes(RANGE_SEPARATOR)) {
    return isNumber(body) ? [{ field: field.id, operator: FilterOperator.Is, values: [body] }] : [];
  }

  const [min, max, ...rest] = body.split(RANGE_SEPARATOR);
  const readable = min !== undefined && max !== undefined && rest.length === 0 && isBound(min) && isBound(max);

  return readable && (min !== '' || max !== '')
    ? [{ field: field.id, operator: FilterOperator.Between, values: [min, max] }]
    : [];
}

function valueConditions(field: FilterField, body: string): Array<FilterCondition> {
  const tokens = body.split(VALUE_SEPARATOR).filter((token) => token !== '');
  const include = tokens.filter((token) => !token.startsWith(EXCLUDE_MARK)).map((token) => unescapeValue(token));

  const exclude = tokens
    .filter((token) => token.startsWith(EXCLUDE_MARK))
    .map((token) => unescapeValue(token.slice(EXCLUDE_MARK.length)))
    .filter((value) => value !== '');

  const included: Array<FilterCondition> =
    include.length === 0
      ? []
      : [
          {
            field: field.id,
            operator: include.length === 1 ? FilterOperator.Is : FilterOperator.IsAnyOf,
            values: include,
          },
        ];

  const excluded = exclude.map((value): FilterCondition => ({
    field: field.id,
    operator: FilterOperator.IsNot,
    values: [value],
  }));

  return [...included, ...excluded];
}

function segmentConditions(fields: ReadonlyMap<string, FilterField>, segment: string): Array<FilterCondition> {
  const at = segment.indexOf(FIELD_SEPARATOR);
  const field = at < 1 ? undefined : fields.get(segment.slice(0, at));

  if (field === undefined) {
    return [];
  }

  const body = segment.slice(at + FIELD_SEPARATOR.length);

  return field.kind === FilterKind.Range ? rangeConditions(field, body) : valueConditions(field, body);
}

/**
 * Writes the filter bar's conditions as the text of a link and reads them back, for any set of fields. Each
 * condition is `<field>:<values>`, joined by `~`, so a field may have several. The default operator is left
 * unwritten: a set or flag field's `is` is its bare values (`traits:fire,evil`, read back as `is` for one value and
 * `is any of` for several) and a range's `is` is one number (`level:3`); `is not` marks each value with `!`
 * (`traits:!evil`) and `between` joins two bounds with `..` (`level:1..5`, `level:..3`). Values containing `~`, `,`,
 * `:`, `!` or `%` are written with a `%` code.
 */
export interface FilterCodec {
  /** Conditions of unknown fields, with an operator the field lacks, or without values are left out. */
  readonly encode: (conditions: ReadonlyArray<FilterCondition>) => string;
  /**
   * Segments of unknown fields or that do not read are dropped, never thrown on, so an old or edited link still
   * opens. Reads every text `encode` writes, and the earlier `traits:fire,!evil~level:1..5` form too.
   */
  readonly decode: (text: string) => ReadonlyArray<FilterCondition>;
}

/** The codec for the fields `fields` gives, read on each call so it follows a page whose fields change. */
export function filterCodec(fields: () => ReadonlyArray<FilterField>): FilterCodec {
  const current = (): ReadonlyMap<string, FilterField> => new Map(fields().map((field) => [field.id, field]));

  return {
    encode: (conditions) => {
      const known = current();

      return conditions
        .flatMap((condition): Array<string> => {
          const field = known.get(condition.field);
          const text = field === undefined ? undefined : conditionText(field, condition);

          return text === undefined ? [] : [text];
        })
        .join(CONDITION_SEPARATOR);
    },
    decode: (text) => {
      const known = current();

      return text.split(CONDITION_SEPARATOR).flatMap((segment) => segmentConditions(known, segment));
    },
  };
}
