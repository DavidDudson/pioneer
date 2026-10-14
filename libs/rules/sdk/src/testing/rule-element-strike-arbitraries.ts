import { array, constant, constantFrom, double, oneof, option, record, stringMatching } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { NumericAlterationMode, TraitAlterationMode } from '../rule-element-item-alteration';
import { predicateJson, validFormulaText } from './arbitraries';
import { ruleElementJson as otherElementJson } from './rule-element-arbitraries';

const SLUG_WORDS_MAX = 3;
const word: Arbitrary<string> = stringMatching(/^[a-z\d]{1,6}$/u);
const slug: Arbitrary<string> = array(word, { minLength: 1, maxLength: SLUG_WORDS_MAX }).map((words) =>
  words.join('-'),
);
const ruleNumber: Arbitrary<number> = double({ noNaN: true, noDefaultInfinity: true });
const ruleValue = oneof(ruleNumber, validFormulaText);
const traitModes = constantFrom(...Object.values(TraitAlterationMode));
const numericModes = constantFrom(...Object.values(NumericAlterationMode));
const strikes = option(predicateJson, { nil: undefined });

function adjustment(property: string, mode: Arbitrary<string>, value: Arbitrary<unknown>): Arbitrary<object> {
  const fields = record({ key: constant('AdjustStrike'), property: constant(property), mode, value, strikes });
  return fields.map((each) => Object.fromEntries(Object.entries(each).filter(([, picked]) => picked !== undefined)));
}

/** Valid `AdjustStrike` elements of every property, as plain JSON (unparsed). */
const adjustStrikeJson: Arbitrary<object> = oneof(
  adjustment('traits', traitModes, slug),
  adjustment('materials', constant('add'), slug),
  adjustment('property-runes', constant('add'), slug),
  adjustment('range-increment', numericModes, ruleValue),
);

/** Valid rule elements of every `key` the SDK knows, as plain JSON (unparsed). */
export const ruleElementJson: Arbitrary<object> = oneof(otherElementJson, adjustStrikeJson);
