import { array, boolean, constant, constantFrom, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { Attribute } from '../attribute';
import { SenseAcuity } from '../sense';
import { StatisticKind } from '../statistic';
import { actorFormulaText, keyPathText } from './arbitraries';
import { LIST_MAX, withOptional } from './json-arbitraries';

const statisticKind: Arbitrary<string> = constantFrom(...Object.values(StatisticKind));
const attribute: Arbitrary<string> = constantFrom(...Object.values(Attribute));

export const statisticData: Arbitrary<object> = withOptional(
  record({
    selector: keyPathText,
    domains: array(keyPathText, { maxLength: LIST_MAX }),
    base: actorFormulaText,
    kind: statisticKind,
  }),
  { keyAttribute: attribute },
);

export const senseData: Arbitrary<object> = withOptional(constant({}), {
  acuity: constantFrom(...Object.values(SenseAcuity)),
  unlimitedRange: boolean(),
});
