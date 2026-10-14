import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' } });
}

describe('FlatModifier from Foundry', () => {
  test('a selector becomes selectors, a skill or save by its statistic and a domain as it is', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.FlatModifier,
      selector: ['diplomacy', 'reflex', 'saving-throw', 'ac'],
      type: 'circumstance',
      value: 2,
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.FlatModifier,
        selectors: ['skill:diplomacy', 'save:reflex', 'saving-throw', 'ac'],
        type: 'circumstance',
        value: 2,
      },
    ]);
  });

  test('a bare selector is one selector, and an omitted type is untyped', () => {
    const { rules } = translated({ key: RuleElementKey.FlatModifier, selector: 'strike-damage', value: 1 });

    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.FlatModifier, selectors: ['strike-damage'], type: 'untyped', value: 1 },
    ]);
  });

  test('hideIfDisabled is dropped and the label becomes the display label', () => {
    const { rules } = translated({
      key: RuleElementKey.FlatModifier,
      hideIfDisabled: true,
      label: 'Educate Allies',
      selector: 'perception',
      type: 'status',
      value: 1,
    });

    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.FlatModifier,
        display: { label: 'Educate Allies' },
        selectors: ['perception'],
        type: 'status',
        value: 1,
      },
    ]);
  });

  test.each([
    ['removeAfterRoll', { removeAfterRoll: 'if-enabled' }],
    ['requiresEquipped', { requiresEquipped: false }],
    ['a damage category', { damageType: 'acid', damageCategory: 'splash' }],
    ['a selector built from the item', { selector: '{item|id}-ranged-damage' }],
  ])('%s has no Pioneer meaning yet, so the element is kept for the backlog', (_case, extra) => {
    const raw = { key: RuleElementKey.FlatModifier, selector: 'damage', type: 'status', value: 1, ...extra };
    const { rules, untranslated } = translated(raw);

    expect(rules as readonly unknown[]).toEqual([]);
    expect(untranslated).toEqual([{ entry: ENTRY, key: RuleElementKey.FlatModifier, raw }]);
  });
});

describe('predicates from Foundry', () => {
  test('a bare roll option gets a namespace, in compounds and comparisons too', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.FlatModifier,
      predicate: [
        'action:make-an-impression',
        'devils-bargain',
        { or: ['poison', { not: 'disease' }] },
        { gte: ['self:level', 5] },
      ],
      selector: 'diplomacy',
      type: 'item',
      value: 2,
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({
      predicate: [
        'action:make-an-impression',
        'option:devils-bargain',
        { or: ['option:poison', { not: 'option:disease' }] },
        { gte: ['self:level', 5] },
      ],
    });
  });
});
