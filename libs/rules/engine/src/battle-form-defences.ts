import { DamageAdjustmentTargetSchema } from '@pioneer/rules/sdk';

import type { FormInPlay } from './battle-form';
import { amountOf, DefenceStatusKind, failed, NONE } from './defence-lines';
import type { AdjustmentLine, Defences, DefenceStatus } from './defence-lines';
import { NO_ITEM } from './rule-in-play';
import { valueOf } from './rule-value';
import type { RuleContext } from './rule-value';

/** What a form lists as weaknesses or resistances. */
type FormAdjustments = NonNullable<FormInPlay['form']['weaknesses']>;

const APPLIED: DefenceStatus = { kind: DefenceStatusKind.Applied };

/**
 * The lines a battle form's weaknesses or resistances give, credited to the form. One whose type is a trait rather
 * than a damage type or group is left out, as the damage pipeline matches only damage types and groups.
 */
function formAdjustmentLines(
  form: FormInPlay,
  listed: FormAdjustments | undefined,
  context: RuleContext,
): readonly AdjustmentLine[] {
  return (listed ?? []).flatMap(({ type, value, exceptions }): AdjustmentLine[] => {
    const target = DamageAdjustmentTargetSchema.safeParse(type);
    const outcome = valueOf(value, context.resolve(NO_ITEM));
    const result = outcome.ok
      ? amountOf(outcome.value, APPLIED)
      : { value: undefined, status: failed(APPLIED, outcome.error, outcome.position) };
    if (!target.success || result === undefined) {
      return [];
    }
    const { id, label, origin } = form;
    return [{ id, label, origin, type: target.data, exceptions: exceptions ?? NONE, ...result }];
  });
}

/** The lines a battle form in force gives: its immunities, weaknesses and resistances, with the form as origin. */
export function formDefences(form: FormInPlay | undefined, context: RuleContext): Defences {
  if (form === undefined) {
    return { immunities: [], weaknesses: [], resistances: [] };
  }
  const { id, label, origin } = form;
  const types = new Set((form.form.immunities ?? []).map(({ type }) => type));
  return {
    immunities: [...types].map((type) => ({ id, label, origin, type, status: APPLIED })),
    weaknesses: formAdjustmentLines(form, form.form.weaknesses, context),
    resistances: formAdjustmentLines(form, form.form.resistances, context),
  };
}
