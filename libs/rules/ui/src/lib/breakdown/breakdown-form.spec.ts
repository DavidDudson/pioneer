import { FormSource, LineStatusKind, SuppressionReason } from '@pioneer/rules/engine';
import { ModifierType } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { BREASTPLATE, GOLEM_FORM, line, ruleId, statistic, term } from '../testing/breakdown-fixtures';
import { formReplacement } from '../testing/form-fixtures';
import { render } from '../testing/render-breakdown';
import { BreakdownView } from './breakdown.component';

describe(`${BreakdownView.name} battle form`, () => {
  it('says the form’s value with the character’s own beside it', async () => {
    const value = {
      ...statistic('ac', { base: [term('10', 10)] }),
      form: formReplacement(FormSource.Form),
    };

    const { captions } = await render(value);

    expect(captions[0]).toBe('22 from Golem Form; yours 19');
  });

  it('says when the character’s own is higher', async () => {
    const value = {
      ...statistic('ac', { base: [term('10', 10)] }),
      form: formReplacement(FormSource.Own),
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
      form: formReplacement(FormSource.Form),
    };

    const { lines } = await render(value);

    expect(lines).toStrictEqual(['Breastplate | +4 item | Suppressed | Golem Form removes it.']);
  });
});
