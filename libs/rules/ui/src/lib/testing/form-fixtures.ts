import { EngineMessage, FormSource, LabelParam } from '@pioneer/rules/engine';
import type { FormReplacement } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import { StatisticKind } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { NamedStatistic } from '../statistics/statistics.component';
import { FIGHTER_FORTITUDE, GOLEM_FORM, origin, ruleId, statistic, term } from './breakdown-fixtures';

const FORM_VALUE = 22;
const OWN_VALUE = 19;
const AC_BASE = 10;

/** A form's replacement of a statistic: its value, the character's own beside it, and the sentence that says so. */
export function formReplacement(source: FormSource): FormReplacement {
  const key = source === FormSource.Form ? EngineMessage.FormReplaces : EngineMessage.FormOwnHigher;
  return {
    source,
    rule: ruleId(GOLEM_FORM),
    label: { entry: GOLEM_FORM },
    base: FormulaValue.parse(FORM_VALUE),
    value: FormulaValue.parse(FORM_VALUE),
    own: FormulaValue.parse(OWN_VALUE),
    summary: {
      message: message(key, { value: FORM_VALUE, own: OWN_VALUE, form: GOLEM_FORM }),
      named: { param: LabelParam.Form, origin: origin(GOLEM_FORM) },
    },
  };
}

/** Armor Class a form sets, and Fortitude the character's own beats: only the first is marked "from Golem Form". */
export const FORM_STATISTICS: readonly NamedStatistic[] = [
  {
    name: 'Armor Class',
    kind: StatisticKind.Dc,
    result: { ...statistic('ac', { base: [term(`${AC_BASE}`, AC_BASE)] }), form: formReplacement(FormSource.Form) },
  },
  {
    name: 'Fortitude',
    kind: StatisticKind.Check,
    result: { ...FIGHTER_FORTITUDE, form: formReplacement(FormSource.Own) },
  },
];
