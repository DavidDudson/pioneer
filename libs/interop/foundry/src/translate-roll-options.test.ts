import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object, item = 'Bands of Imprisonment'): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: { PF2E: { Label: 'Divine Spark' } }, values: { item } });
}

describe('RollOption from Foundry', () => {
  test('a bare option is under the option namespace, and a label is the toggle display label', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.RollOption,
      label: 'PF2E.Label',
      option: 'marked-for-death',
      toggleable: true,
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.RollOption,
        display: { label: 'Divine Spark' },
        option: 'option:marked-for-death',
        toggleable: true,
      },
    ]);
  });

  test('an option in a namespace stays, with its starting state and predicate', () => {
    const { rules } = translated({
      key: RuleElementKey.RollOption,
      option: 'target:condition:off-guard',
      predicate: ['bracers-of-devotion:blessed-shield'],
      toggleable: true,
      value: true,
    });

    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.RollOption,
        option: 'target:condition:off-guard',
        predicate: ['bracers-of-devotion:blessed-shield'],
        toggleable: true,
        value: true,
      },
    ]);
  });

  test('a domain is a selector, so a skill is by its statistic', () => {
    const { rules } = translated({
      key: RuleElementKey.RollOption,
      domain: 'performance',
      option: 'playing',
      toggleable: true,
    });

    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.RollOption, domain: 'skill:performance', option: 'option:playing', toggleable: true },
    ]);
  });

  test('suboptions keep their values, a label naming the item is its name, and placement fields are dropped', () => {
    const { rules, untranslated } = translated({
      alwaysActive: true,
      domain: 'damage',
      key: RuleElementKey.RollOption,
      option: 'spark-dancer',
      phase: 'beforeDerived',
      placement: 'spellcasting',
      suboptions: [
        { label: 'PF2E.Label', value: 'fire' },
        { label: '{item|name}', value: 'electricity', predicate: ['self:effect:spark'] },
      ],
      toggleable: true,
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.RollOption,
        domain: 'damage',
        option: 'option:spark-dancer',
        suboptions: [
          { label: 'Divine Spark', value: 'fire' },
          { label: 'Bands of Imprisonment', value: 'electricity', predicate: ['self:effect:spark'] },
        ],
        toggleable: true,
      },
    ]);
  });

  test.each([
    ['mergeable', { mergeable: true }],
    ['disabledIf', { disabledIf: [{ not: 'amp-spell' }], disabledValue: false }],
    ['a toggleable that is no flag', { toggleable: 'totm' }],
    ['count', { count: true }],
    ['requiresEquipped', { requiresEquipped: false }],
    ['an option read from an actor flag', { option: 'draconic-benefactor:{actor|flags.system.dragon}' }],
  ])('%s has no Pioneer meaning yet, so the element is kept for the backlog', (_case, extra) => {
    const raw = { key: RuleElementKey.RollOption, option: 'finisher', toggleable: true, ...extra };

    expect(translated(raw).untranslated).toEqual([{ entry: ENTRY, key: RuleElementKey.RollOption, raw }]);
  });
});
