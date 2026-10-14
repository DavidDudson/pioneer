import {
  array,
  boolean,
  constant,
  constantFrom,
  double,
  integer,
  oneof,
  option,
  record,
  stringMatching,
  tuple,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { keyPathText, predicateJson, validFormulaText } from './arbitraries';

export const LIST_MAX = 3;
export const SMALLINT_MAX = 32_767;

/** Kebab-case words: slugs, rule slugs, traits. */
const word: Arbitrary<string> = stringMatching(/^[a-z\d]{1,6}$/u);
const SLUG_WORDS_MAX = 3;
export const slugText: Arbitrary<string> = array(word, { minLength: 1, maxLength: SLUG_WORDS_MAX }).map((words) =>
  words.join('-'),
);
export const contentText: Arbitrary<string> = stringMatching(/^[A-Za-z][A-Za-z ]{0,19}$/u);
const modifierNumber: Arbitrary<number> = integer({ min: -SMALLINT_MAX, max: SMALLINT_MAX });
export const ruleNumber: Arbitrary<number> = double({ noNaN: true, noDefaultInfinity: true });
export const targets: Arbitrary<string[]> = array(keyPathText, { minLength: 1, maxLength: LIST_MAX });

type OptionalEntry = readonly [string, unknown];

/** Builds a record whose optional keys are left out (not set to undefined) when absent. */
export function withOptional<TRequired extends object>(
  required: Arbitrary<TRequired>,
  optional: Readonly<Record<string, Arbitrary<unknown>>>,
): Arbitrary<object> {
  const optionals = Object.entries(optional).map(([key, value]) =>
    option(value, { nil: undefined }).map((picked): OptionalEntry => [key, picked]),
  );
  return tuple(required, ...optionals).map(([fields, ...entries]): object => {
    const present = entries.filter(([, picked]) => picked !== undefined);
    return Object.fromEntries([...Object.entries(fields), ...present]);
  });
}

const base = {
  predicate: predicateJson,
  priority: modifierNumber,
  display: withOptional(constant({}), { label: contentText, hidden: boolean() }),
};

export function element(
  key: string,
  required: Readonly<Record<string, Arbitrary<unknown>>>,
  optional = {},
): Arbitrary<object> {
  return withOptional(record({ key: constant(key), ...required }), { ...base, ...optional });
}

/** Any value of a const object (`ModifierType`, `DamageType`). */
export const modifierValue = oneof(modifierNumber, validFormulaText);

export function anyOf<TValue>(values: Readonly<Record<string, TValue>>): Arbitrary<TValue> {
  return constantFrom(...Object.values(values));
}
