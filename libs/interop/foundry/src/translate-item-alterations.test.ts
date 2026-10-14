import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: 'Oath of the Avenger' } });
}

describe('ItemAlteration from Foundry', () => {
  test('an item type and the item statements of the predicate are the items it reaches', () => {
    const { rules, untranslated } = translated({
      itemType: 'spell',
      key: RuleElementKey.ItemAlteration,
      mode: 'add',
      predicate: ['item:slug:lay-on-hands', 'oath-of-the-avenger'],
      property: 'traits',
      value: 'spirit',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        items: ['item:type:spell', 'item:slug:lay-on-hands'],
        key: RuleElementKey.ItemAlteration,
        mode: 'add',
        predicate: ['option:oath-of-the-avenger'],
        property: 'traits',
        value: 'spirit',
      },
    ]);
  });

  test('a trait removed and a number added', () => {
    const removed = translated({
      itemType: 'spell',
      key: RuleElementKey.ItemAlteration,
      mode: 'remove',
      property: 'traits',
      value: 'vitality',
    });
    const hardness = translated({
      itemType: 'shield',
      key: RuleElementKey.ItemAlteration,
      mode: 'add',
      predicate: ['item:equipped'],
      property: 'hardness',
      value: 5,
    });

    expect(removed.untranslated).toEqual([]);
    expect(hardness.untranslated).toEqual([]);
    expect(hardness.rules as readonly unknown[]).toEqual([
      {
        items: ['item:type:shield', 'item:equipped'],
        key: RuleElementKey.ItemAlteration,
        mode: 'add',
        property: 'hardness',
        value: 5,
      },
    ]);
  });

  test('an alteration of the item that holds it, a property with no number, and a value from a pick stay', () => {
    const own = translated({
      itemId: '{item|id}',
      key: RuleElementKey.ItemAlteration,
      mode: 'add',
      property: 'traits',
      value: 'reach',
    });
    const text = translated({
      itemType: 'feat',
      key: RuleElementKey.ItemAlteration,
      mode: 'add',
      property: 'description',
      value: [{ text: 'More.' }],
    });
    const picked = translated({
      itemType: 'weapon',
      key: RuleElementKey.ItemAlteration,
      mode: 'add',
      property: 'traits',
      value: '{actor|class.slug}',
    });

    expect([own, text, picked].map(({ rules }) => rules)).toEqual([[], [], []]);
    expect([own, text, picked].map(({ untranslated }) => untranslated.length)).toEqual([1, 1, 1]);
  });
});
