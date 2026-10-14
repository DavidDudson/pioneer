import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' } });
}

describe('AdjustDegreeOfSuccess from Foundry', () => {
  test('a save is read as a statistic, and its predicate carries over', () => {
    const { rules, untranslated } = translated({
      key: 'AdjustDegreeOfSuccess',
      adjustment: { success: 'one-degree-better' },
      predicate: ['item:trait:fear'],
      selector: 'will',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: 'AdjustDegreeOfSuccess',
        selectors: ['save:will'],
        adjustment: { success: 'one-degree-better' },
        predicate: ['item:trait:fear'],
      },
    ]);
  });

  test('a skill and Foundry’s check type carry over', () => {
    const { rules, untranslated } = translated({
      key: 'AdjustDegreeOfSuccess',
      adjustment: { success: 'one-degree-better' },
      predicate: [{ or: ['action:climb', 'action:swim'] }],
      selector: 'athletics',
      type: 'skill',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      expect.objectContaining({ selectors: ['skill:athletics'], checkType: 'skill' }),
    ]);
  });

  test('a degree adjusted several ways, and all of them, carry over', () => {
    const { rules, untranslated } = translated({
      key: 'AdjustDegreeOfSuccess',
      adjustment: { criticalFailure: 'to-success', failure: 'to-success' },
      selector: 'skill-check',
    });

    expect(untranslated).toEqual([]);
    expect(rules).toHaveLength(1);
  });
});

describe('RollTwice from Foundry', () => {
  test('several selectors and what to keep carry over', () => {
    const { rules, untranslated } = translated({
      key: 'RollTwice',
      keep: 'lower',
      selector: ['deception', 'diplomacy', 'intimidation', 'performance'],
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: 'RollTwice',
        keep: 'lower',
        selectors: ['skill:deception', 'skill:diplomacy', 'skill:intimidation', 'skill:performance'],
      },
    ]);
  });

  test('removeAfterRoll: false is Foundry’s default and is dropped', () => {
    const { untranslated } = translated({
      key: 'RollTwice',
      keep: 'lower',
      removeAfterRoll: false,
      selector: ['attack-roll', 'skill-check'],
    });

    expect(untranslated).toEqual([]);
  });

  test('removeAfterRoll: true, an effect spent by the roll, is kept for the backlog', () => {
    const raw = { key: 'RollTwice', keep: 'higher', removeAfterRoll: true, selector: 'perception' };
    const { rules, untranslated } = translated(raw);

    expect(rules).toEqual([]);
    expect(untranslated).toEqual([{ entry: ENTRY, key: 'RollTwice', raw }]);
  });
});

describe('SubstituteRoll from Foundry', () => {
  test('a fixed result for a check carries over', () => {
    const { rules, untranslated } = translated({
      key: 'SubstituteRoll',
      predicate: ['action:recall-knowledge'],
      selector: 'skill-check',
      slug: 'assured-knowledge',
      value: 10,
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: 'SubstituteRoll',
        selectors: ['skill-check'],
        slug: 'assured-knowledge',
        value: 10,
        predicate: ['action:recall-knowledge'],
      },
    ]);
  });

  test('a skill read from a ChoiceSet pick is kept for the backlog', () => {
    const raw = {
      key: 'SubstituteRoll',
      selector: '{item|flags.system.rulesSelections.assurance}',
      slug: 'assurance',
      value: 10,
    };

    expect(translated(raw).untranslated).toHaveLength(1);
  });
});
