import { describe, expect, test } from 'bun:test';

import { idOf } from '@pioneer/rules/grants/testing';
import { RollOption, RuleElement, SpellRank } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { EffectCommandField, EffectCommandSchema, effectProblem, EffectProblem } from './effect-commands';
import { formRanks } from './effect-form-ranks';
import { EffectInstanceId, effectTerms } from './effects';
import type { EffectContent } from './effects';

installRulesFakes();

const HUMANOID_FORM = [
  RuleElement.parse({
    key: 'ChoiceSet',
    flag: 'humanoid-form',
    rollOption: 'humanoid-form',
    prompt: 'Select a form.',
    choices: [
      { value: 'small', label: 'Small Humanoid' },
      { value: 'large', label: 'Large Humanoid', predicate: [{ gte: ['parent:origin:item:level', 5] }] },
      { value: 'odd', label: 'Odd Humanoid', predicate: [{ gte: ['self:level', 9] }] },
    ],
  }),
];
const LARGE = RollOption.parse('humanoid-form:large');
const SMALL = RollOption.parse('humanoid-form:small');
const EFFECT = idOf('humanoid-form');
const CONTENT: EffectContent = new Map([
  [
    EFFECT,
    {
      ...effectTerms({ category: 'spell', duration: { type: 'unlimited' } }, true),
      formRanks: formRanks(HUMANOID_FORM),
    },
  ],
]);

/** Why applying the effect with `form` at `rank` is refused, if it is. */
function refusal(form: RollOption | undefined, rank: number | undefined): EffectProblem | undefined {
  const command = EffectCommandSchema.parse({
    field: EffectCommandField.ApplyEffect,
    id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000001'),
    effect: EFFECT,
    ...(form === undefined ? {} : { form }),
    ...(rank === undefined ? {} : { rank: SpellRank.parse(rank) }),
  });
  return effectProblem([], command, CONTENT);
}

describe('formRanks', () => {
  test('a form gated on the rank of the spell is offered from that rank', () => {
    expect(formRanks(HUMANOID_FORM)).toEqual(new Map([[LARGE, SpellRank.parse(5)]]));
  });

  test('a form with no gate, or a gate on anything but the rank of the spell, has no lowest rank', () => {
    expect(formRanks(HUMANOID_FORM).has(SMALL)).toBe(false);
    expect(formRanks([])).toEqual(new Map());
  });
});

describe('applying a form at a rank', () => {
  test('a form is refused below its lowest rank, and taken at it and above', () => {
    expect(refusal(LARGE, 4)).toBe(EffectProblem.Rank);
    expect(refusal(LARGE, 5)).toBeUndefined();
    expect(refusal(LARGE, 9)).toBeUndefined();
  });

  test('a gated form needs a rank, since without one it can not be shown to reach it', () => {
    expect(refusal(LARGE, undefined)).toBe(EffectProblem.Rank);
  });

  test('a form with no gate is taken at any rank', () => {
    expect(refusal(SMALL, 3)).toBeUndefined();
    expect(refusal(undefined, undefined)).toBeUndefined();
  });
});
