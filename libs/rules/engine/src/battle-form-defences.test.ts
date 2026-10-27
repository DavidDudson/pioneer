import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, RollOptionNamespace, RollOptionTail } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { battleFormInPlay, factsUnderForm } from './battle-form';
import { DefenceStatusKind, deriveDefences } from './defences';
import type { Defences } from './defences';
import type { RuleInPlay } from './rule-in-play';
import { inPlay } from './testing';
import { FORM_FACTS, FORM_INPUTS, formRule } from './testing/battle-form-fixtures';

const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };

function defences(rules: readonly RuleInPlay[]): Defences {
  return deriveDefences(content, FORM_INPUTS, { rules, facts: FORM_FACTS });
}

function formOrigin(): string {
  const form = battleFormInPlay({ rules: [formRule({})], facts: FORM_FACTS });
  if (form === undefined) {
    throw new Error('expected a form');
  }
  return form.origin.entry;
}

describe('battle form: defences', () => {
  test('the form’s immunities join the defences with the form as origin', () => {
    const own = inPlay({ key: 'Immunity', type: ['poison'] }, 'ancestry');
    const form = formRule({ immunities: [{ type: 'fire' }, { type: 'fire' }, { type: 'sleep' }] });

    const { immunities } = defences([own, form]);

    expect(immunities.map(({ type }) => String(type))).toEqual(['fire', 'poison', 'sleep']);
    expect(immunities.filter(({ origin }) => origin.entry === formOrigin())).toHaveLength(2);
  });

  test('the form’s resistances and weaknesses join, and the higher resistance wins', () => {
    const own = inPlay({ key: 'Resistance', type: ['fire'], value: 3 }, 'ancestry');
    const form = formRule({
      resistances: [{ type: 'fire', value: 5, exceptions: ['magical'] }],
      weaknesses: [{ type: 'cold', value: 5 }],
    });

    const result = defences([own, form]);

    expect(result.weaknesses.map(({ type, value }) => [type, Number(value)])).toEqual([['cold', 5]]);
    expect(result.resistances.map(({ status }) => status.kind)).toEqual([
      DefenceStatusKind.Applied,
      DefenceStatusKind.Superseded,
    ]);
    expect(result.resistances[0]?.exceptions.map(String)).toEqual(['magical']);
  });

  test('only the lines the form gives are marked as from the form', () => {
    const own = inPlay({ key: 'Resistance', type: ['fire'], value: 3 }, 'ancestry');
    const form = formRule({ resistances: [{ type: 'fire', value: 5 }], immunities: [{ type: 'sleep' }] });

    const result = defences([own, form]);

    expect(result.resistances.map(({ fromForm }) => fromForm)).toEqual([true, undefined]);
    expect(result.immunities.map(({ fromForm }) => fromForm)).toEqual([true]);
  });

  test('a value that is a formula reads the character', () => {
    const form = formRule({ resistances: [{ type: 'physical', value: '@level + 2' }] });

    expect(Number(defences([form]).resistances[0]?.value)).toBe(5);
  });

  test('a weakness to a trait, which damage does not match, is left out', () => {
    const form = formRule({ weaknesses: [{ type: 'holy', value: 5 }] });

    expect(defences([form]).weaknesses).toEqual([]);
  });

  test('a form whose predicate fails gives nothing', () => {
    const form = formRule({ immunities: [{ type: 'fire' }] }, { predicate: ['form:animal'] });

    expect(defences([form]).immunities).toEqual([]);
  });
});

describe('battle form: traits', () => {
  test('the form’s traits become the character’s roll options', () => {
    const facts = factsUnderForm({ rules: [formRule({ traits: ['plant', 'animal'] })], facts: FORM_FACTS });

    expect(facts.has('self:trait:plant')).toBe(true);
    expect(facts.has('self:trait:animal')).toBe(true);
    expect(FORM_FACTS.has('self:trait:plant')).toBe(false);
  });

  test('the facts are the same without a form or traits', () => {
    expect(factsUnderForm({ rules: [], facts: FORM_FACTS })).toBe(FORM_FACTS);
    expect(factsUnderForm({ rules: [formRule({})], facts: FORM_FACTS })).toBe(FORM_FACTS);
  });

  test('the character’s own options stay, and a namespace layer keeps its answers', () => {
    const base = new PredicateFacts([RollOption.parse('self:trait:human')], CORE_NAMESPACES);
    const layered = base.withNamespace(RollOptionNamespace.parse('item'), [RollOptionTail.parse('equipped')]);
    const under = layered.plus([RollOption.parse('self:trait:plant')]);

    expect(under.has('self:trait:human')).toBe(true);
    expect(under.has('self:trait:plant')).toBe(true);
  });
});
