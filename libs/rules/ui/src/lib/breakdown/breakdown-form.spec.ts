import { EngineMessage, FormSource, LabelParam, LineStatusKind, SuppressionReason } from '@pioneer/rules/engine';
import type { FormReplacement } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import { ModifierType } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { BREASTPLATE, GOLEM_FORM, line, origin, ruleId, statistic, term } from '../testing/breakdown-fixtures';
import { render } from '../testing/render-breakdown';
import { BreakdownView } from './breakdown.component';

const BASE = 22;
const OWN = 19;

/** A form's replacement of a statistic: its value, the character's own beside it, and the sentence that says so. */
function replacement(source: FormSource, key: string): FormReplacement {
  return {
    source,
    rule: ruleId(GOLEM_FORM),
    label: { entry: GOLEM_FORM },
    base: FormulaValue.parse(BASE),
    value: FormulaValue.parse(BASE),
    own: FormulaValue.parse(OWN),
    summary: {
      message: message(key, { value: BASE, own: OWN, form: GOLEM_FORM }),
      named: { param: LabelParam.Form, origin: origin(GOLEM_FORM) },
    },
  };
}

describe(`${BreakdownView.name} battle form`, () => {
  it('says the form’s value with the character’s own beside it', async () => {
    const value = {
      ...statistic('ac', { base: [term('10', 10)] }),
      form: replacement(FormSource.Form, EngineMessage.FormReplaces),
    };

    const { captions } = await render(value);

    expect(captions[0]).toBe('22 from Golem Form; yours 19');
  });

  it('says when the character’s own is higher', async () => {
    const value = {
      ...statistic('ac', { base: [term('10', 10)] }),
      form: replacement(FormSource.Own, EngineMessage.FormOwnHigher),
    };

    const { captions } = await render(value);

    expect(captions[0]).toBe('Yours 19 is higher than the 22 from Golem Form');
  });

  it('says the form removed the armour’s line', async () => {
    const removed = line(BREASTPLATE, {
      type: ModifierType.Item,
      value: 4,
      status: { kind: LineStatusKind.Suppressed, by: ruleId(GOLEM_FORM), reason: SuppressionReason.Form },
    });
    const value = {
      ...statistic('ac', { base: [term('10', 10)], lines: [removed] }),
      form: replacement(FormSource.Form, EngineMessage.FormReplaces),
    };

    const { lines } = await render(value);

    expect(lines).toStrictEqual(['Breastplate | +4 item | Suppressed | Golem Form removes it.']);
  });
});
