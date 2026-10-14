import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: 'Arachnid Harness' } });
}

describe('Resistance, Weakness and Immunity from Foundry', () => {
  test('a resistance to a damage type is a list of one', () => {
    const { rules, untranslated } = translated({ key: RuleElementKey.Resistance, type: 'poison', value: 2 });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([{ key: RuleElementKey.Resistance, type: ['poison'], value: 2 }]);
  });

  test('all-damage is the all group, in a list or alone', () => {
    const alone = translated({ key: RuleElementKey.Resistance, type: 'all-damage', value: 20 });
    const listed = translated({ key: RuleElementKey.Resistance, type: ['all-damage'], value: 20 });

    expect(alone.rules as readonly unknown[]).toEqual([{ key: RuleElementKey.Resistance, type: ['all'], value: 20 }]);
    expect(listed.rules).toEqual(alone.rules);
  });

  test('a formula value is in Pioneer spelling, and a predicate reads bare roll options', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.Weakness,
      predicate: ['bounce-away'],
      type: ['fire', 'cold'],
      value: '@actor.level',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.Weakness,
        predicate: ['option:bounce-away'],
        type: ['fire', 'cold'],
        value: '@level',
      },
    ]);
  });

  test('exceptions stand', () => {
    const { rules, untranslated } = translated({
      exceptions: ['adamantine'],
      key: RuleElementKey.Resistance,
      type: 'physical',
      value: 5,
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.Resistance, exceptions: ['adamantine'], type: ['physical'], value: 5 },
    ]);
  });

  test('an immunity is a list of what it covers', () => {
    const { rules, untranslated } = translated({ key: RuleElementKey.Immunity, type: 'paralyzed' });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([{ key: RuleElementKey.Immunity, type: ['paralyzed'] }]);
  });

  test.each([
    ['a type picked by a ChoiceSet', { type: '{item|flags.system.rulesSelections.resistance}', value: 10 }],
    ['a custom type', { type: 'custom', definition: ['origin:treerazer'], label: 'PF2E.IWR.Custom', value: 5 }],
    ['a damage trait as the type', { type: 'holy', value: 10 }],
    ['doubleVs', { type: 'all-damage', value: 5, doubleVs: ['non-magical'] }],
    ['a value read from the actor flags', { type: 'fire', value: '@actor.flags.system.ragingResistance' }],
  ])('%s has no Pioneer meaning yet, so the element is kept for the backlog', (_case, extra) => {
    const raw = { key: RuleElementKey.Resistance, ...extra };

    expect(translated(raw).untranslated).toEqual([{ entry: ENTRY, key: RuleElementKey.Resistance, raw }]);
  });

  test('an immunity with exceptions is kept for the backlog, as an immunity has no room for them', () => {
    const raw = { key: RuleElementKey.Immunity, type: 'fire', exceptions: ['magical'] };

    expect(translated(raw).untranslated).toEqual([{ entry: ENTRY, key: RuleElementKey.Immunity, raw }]);
  });
});
