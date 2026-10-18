import { describe, expect, test } from 'bun:test';

import { ModifierType } from '@pioneer/rules/sdk';

import { LineStatusKind, SuppressionReason } from './breakdown';
import { EngineMessage } from './messages';
import { ruleIdOf } from './rule-in-play';
import { FormSource } from './statistic-result';
import { flatModifier, inPlay } from './testing';
import { derived, formRule, OWN_AC, totalOf, valued } from './testing/battle-form-fixtures';

const ATHLETICS = 'skill:athletics';
/** Strength +1, less the breastplate’s check penalty of 2. */
const OWN_ATHLETICS = -1;

describe('battle form: Armor Class', () => {
  test('without a form, armour counts', () => {
    expect(totalOf([], 'ac')).toBe(OWN_AC);
  });

  test('the form’s Armor Class replaces the character’s own when higher, and armour’s bonus drops out', () => {
    const rule = formRule({ armorClass: { modifier: 22 } });

    const ac = valued([rule], 'ac');

    expect(Number(ac.total)).toBe(22);
    expect(Number(ac.computed)).toBe(22);
    expect(ac.form).toMatchObject({ source: FormSource.Form, base: 22, value: 22, own: OWN_AC });
    const armour = ac.lines.find(({ modifier }) => modifier.slug === 'armor-bonus');
    expect(armour?.status).toEqual({
      kind: LineStatusKind.Suppressed,
      by: ruleIdOf(rule),
      reason: SuppressionReason.Form,
    });
  });

  test('the character’s own stands when it is higher, and the breakdown says so', () => {
    const ac = valued([formRule({ armorClass: { modifier: 16 } })], 'ac');

    expect(Number(ac.total)).toBe(OWN_AC);
    expect(ac.form).toMatchObject({ source: FormSource.Own, value: 16, own: OWN_AC });
    expect(ac.form?.summary).toMatchObject({ message: { key: EngineMessage.FormOwnHigher } });
    expect(ac.lines.every(({ status }) => status.kind === LineStatusKind.Applied)).toBe(true);
  });

  test('the summary reads as the form’s value with the character’s own beside it', () => {
    const rule = formRule({ armorClass: { modifier: 22 } });

    const ac = valued([rule], 'ac');

    expect(ac.form?.summary).toEqual({
      message: { key: EngineMessage.FormReplaces, params: { value: 22, own: OWN_AC, form: rule.origin.entry } },
      named: { param: 'form', origin: rule.origin },
    });
  });

  test('status and circumstance bonuses and penalties still apply to the form’s value', () => {
    const rules = [
      formRule({ armorClass: { modifier: 22 } }),
      inPlay(flatModifier(ModifierType.Status, 1, ['ac']), 'shield-spell'),
      inPlay(flatModifier(ModifierType.Circumstance, -2, ['ac']), 'off-guard'),
    ];

    expect(totalOf(rules, 'ac')).toBe(22 + 1 - 2);
  });

  test('an item bonus other than armour’s drops out too', () => {
    const rules = [
      formRule({ armorClass: { modifier: 22 } }),
      inPlay(flatModifier(ModifierType.Item, 1, ['ac']), 'ring'),
    ];

    expect(totalOf(rules, 'ac')).toBe(22);
  });

  test('a formula reads the character: 18 + @level', () => {
    expect(totalOf([formRule({ armorClass: { modifier: '18 + @level' } })], 'ac')).toBe(21);
  });

  test('a formula with no value fails the statistic', () => {
    const ac = derived([formRule({ armorClass: { modifier: '@class.hp' } })], 'ac');

    expect(ac?.ok).toBe(false);
  });

  test('a form whose predicate does not hold changes nothing', () => {
    const ac = valued([formRule({ armorClass: { modifier: 30 } }, { predicate: ['form:animal'] })], 'ac');

    expect(Number(ac.total)).toBe(OWN_AC);
    expect(ac.form).toBeUndefined();
  });

  test('a form that sets no Armor Class leaves it alone', () => {
    expect(valued([formRule({ speeds: { fly: 30 } })], 'ac').form).toBeUndefined();
  });
});

describe('battle form: skills', () => {
  test('without a form, armour’s check penalty applies', () => {
    expect(totalOf([], ATHLETICS)).toBe(OWN_ATHLETICS);
  });

  test('the form’s modifier replaces the character’s own when higher; the check penalty is ignored', () => {
    const athletics = valued([formRule({ skills: [{ skill: ATHLETICS, modifier: 14 }] })], ATHLETICS);

    expect(Number(athletics.total)).toBe(14);
    expect(athletics.form).toMatchObject({ source: FormSource.Form, base: 14, value: 14, own: OWN_ATHLETICS });
  });

  test('a form that says false keeps the check penalty, and it carries over', () => {
    const rule = formRule({
      armorClass: { modifier: 20, ignoreCheckPenalty: false },
      skills: [{ skill: ATHLETICS, modifier: 14 }],
    });

    const athletics = valued([rule], ATHLETICS);

    expect(Number(athletics.total)).toBe(14 - 2);
    expect(athletics.form).toMatchObject({ source: FormSource.Form, base: 14, value: 12, own: OWN_ATHLETICS });
  });

  test('the check penalty’s line says the form removed it', () => {
    const rule = formRule({ skills: [{ skill: ATHLETICS, modifier: 14 }] });

    const athletics = valued([rule], ATHLETICS);

    expect(Number(athletics.total)).toBe(14);
    expect(athletics.lines[0]?.status).toMatchObject({
      kind: LineStatusKind.Suppressed,
      reason: SuppressionReason.Form,
    });
  });

  test('the character’s own stands when higher', () => {
    const athletics = valued([formRule({ skills: [{ skill: ATHLETICS, modifier: -5 }] })], ATHLETICS);

    expect(Number(athletics.total)).toBe(OWN_ATHLETICS);
    expect(athletics.form?.source).toBe(FormSource.Own);
  });

  test('with ownIfHigher false, the form’s modifier is set even when lower', () => {
    const rule = formRule({ skills: [{ skill: ATHLETICS, modifier: -5, ownIfHigher: false }] });

    expect(totalOf([rule], ATHLETICS)).toBe(-5);
  });

  test('a skill the form does not list is the character’s own', () => {
    const acrobatics = valued([formRule({ skills: [{ skill: ATHLETICS, modifier: 14 }] })], 'skill:acrobatics');

    expect(acrobatics.form).toBeUndefined();
    expect(Number(acrobatics.total)).toBe(2 - 2);
  });
});
