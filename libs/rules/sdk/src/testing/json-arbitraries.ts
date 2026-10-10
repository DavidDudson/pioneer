import { array, constantFrom, integer, option, stringMatching, tuple, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DamageType } from '../damage';
import { Size } from '../size';

/** Longest list most arbitraries generate. */
export const LIST_MAX = 3;
export const SMALLINT_MAX = 32_767;
const SLUG_WORDS_MAX = 3;

const word: Arbitrary<string> = stringMatching(/^[a-z\d]{1,6}$/u);
/** Kebab-case: pack ids, slugs, traits. */
export const slugText: Arbitrary<string> = array(word, { minLength: 1, maxLength: SLUG_WORDS_MAX }).map((words) =>
  words.join('-'),
);
export const smallint: Arbitrary<number> = integer({ min: 0, max: SMALLINT_MAX });
export const positive: Arbitrary<number> = integer({ min: 1, max: SMALLINT_MAX });
export const size: Arbitrary<string> = constantFrom(...Object.values(Size));
export const damageType: Arbitrary<string> = constantFrom(...Object.values(DamageType));
export const contentIdJson: Arbitrary<string> = uuid({ version: 4 });

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
