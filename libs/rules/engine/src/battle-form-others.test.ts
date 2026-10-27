import { describe, expect, test } from 'bun:test';

import { ContentId, Feet, ModifierType, Size } from '@pioneer/rules/sdk';
import { PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { sensesInPlay } from './senses-in-play';
import { flatModifier, inPlay } from './testing';
import { FORM_FACTS, FORM_INPUTS, formRule, totalOf } from './testing/battle-form-fixtures';
import { vitalsInPlay } from './vitals-in-play';

describe('battle form: speeds', () => {
  test('the form’s speeds replace the character’s; one it does not list is gone', () => {
    const rules = [formRule({ speeds: { fly: 40 } })];

    expect(totalOf(rules, 'speed:fly')).toBe(40);
    expect(totalOf(rules, 'speed:land')).toBe(0);
  });

  test('the form’s land speed replaces the character’s even when lower', () => {
    expect(totalOf([formRule({ speeds: { land: 15 } })], 'speed:land')).toBe(15);
  });

  test('a status penalty to Speed still applies', () => {
    const rules = [
      formRule({ speeds: { land: 30 } }),
      inPlay(flatModifier(ModifierType.Status, -10, ['speed:land']), 'slowed'),
    ];

    expect(totalOf(rules, 'speed:land')).toBe(20);
  });

  test('a form with no speeds leaves them alone', () => {
    expect(totalOf([formRule({ armorClass: { modifier: 20 } })], 'speed:land')).toBe(25);
  });
});

describe('battle form: senses and size', () => {
  const DARKVISION = ContentId.parse('67979b6a-4b24-5be5-b7ea-94783c497bcb');
  const SCENT = ContentId.parse('279973df-e7b9-5fa1-9bb6-1cfdc54b82b6');
  const SCOPE = {
    statistics: { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
    character: FORM_INPUTS,
    size: Size.Medium,
  };
  const facts = FORM_FACTS;

  test('the form’s senses replace the character’s', () => {
    const rule = formRule({ senses: [{ sense: SCENT, acuity: 'imprecise', range: 30 }] });
    const rules = [inPlay({ key: 'Sense', sense: DARKVISION }, 'ancestry'), rule];

    const senses = sensesInPlay({ rules, facts });

    expect(senses).toEqual([
      { sense: SCENT, acuity: 'imprecise', range: Feet.parse(30), origins: [rule.origin], fromForm: true },
    ]);
  });

  test('a form that lists no senses leaves them alone', () => {
    const rules = [inPlay({ key: 'Sense', sense: DARKVISION }, 'ancestry'), formRule({ speeds: { fly: 30 } })];

    const senses = sensesInPlay({ rules, facts });

    expect(senses.map(({ sense }) => sense)).toEqual([DARKVISION]);
    expect(senses.map(({ fromForm }) => fromForm)).toEqual([undefined]);
  });

  test('the form’s size sets the size and the reach it gives', () => {
    const rule = formRule({ size: 'large' });

    const { size } = vitalsInPlay({ rules: [rule], facts }, SCOPE);

    expect(size).toMatchObject({
      size: Size.Large,
      base: Size.Medium,
      reach: 10,
      origins: [rule.origin],
      form: rule.origin,
    });
  });

  test('a CreatureSize element then applies to the form’s size', () => {
    const rules = [formRule({ size: 'large' }), inPlay({ key: 'CreatureSize', value: 1 }, 'enlarge')];

    expect(vitalsInPlay({ rules, facts }, SCOPE).size).toMatchObject({ size: Size.Huge, reach: 15 });
  });

  test('a size an element sets without a form is not marked as the form’s', () => {
    const rules = [inPlay({ key: 'CreatureSize', value: 1 }, 'enlarge')];

    expect(vitalsInPlay({ rules, facts }, SCOPE).size?.form).toBeUndefined();
  });

  test('a form that names no size changes none', () => {
    expect(vitalsInPlay({ rules: [formRule({ speeds: { fly: 30 } })], facts }, SCOPE).size).toBeUndefined();
  });
});
