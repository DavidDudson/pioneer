import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import { DroppedReason } from './translate-token-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

const TOKEN_LIGHT = {
  key: 'TokenLight',
  predicate: ['active-lantern'],
  value: { bright: 30, dim: 60, color: '#975335', animation: { type: 'torch', speed: 1, intensity: 4 } },
};

describe('rule elements that only change a Foundry token', () => {
  test.each([
    ['TokenLight', TOKEN_LIGHT],
    ['TokenEffectIcon', { key: 'TokenEffectIcon', predicate: ['lit-torch'] }],
    ['TokenMark', { key: 'TokenMark', tag: 'marked-for-death' }],
  ])('%s is dropped on purpose, not kept for the backlog', (key, raw) => {
    const { rules, untranslated, dropped } = translateRules(ENTRY, [raw], { lang: {}, values: { item: 'Lantern' } });

    expect(rules).toEqual([]);
    expect(untranslated).toEqual([]);
    expect(dropped).toEqual([{ entry: ENTRY, key, reason: DroppedReason.TokenOnly }]);
  });

  test('the other elements of the entry are translated as they were', () => {
    const modifier = { key: 'FlatModifier', selector: 'ac', value: 1 };
    const unknown = { key: 'Nonsense' };
    const { rules, untranslated, dropped } = translateRules(ENTRY, [TOKEN_LIGHT, modifier, unknown], {
      lang: {},
      values: { item: 'Lantern' },
    });

    expect(rules).toHaveLength(1);
    expect(untranslated).toEqual([{ entry: ENTRY, key: 'Nonsense', raw: unknown }]);
    expect(dropped).toHaveLength(1);
  });
});
