import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';
import type { RuleElement } from '@pioneer/rules/sdk';

import { mergeRulesIntoText } from './apply-rules-text.ts';
import type { RulesMerge } from './apply-rules.ts';

const ID = ContentId.parse('00000000-0000-5000-8000-000000000001');
const OTHER = ContentId.parse('00000000-0000-5000-8000-000000000002');

const toggle = { key: 'RollOption', option: 'a:b' } as unknown as RuleElement;
const modifier = { key: 'FlatModifier', selectors: ['ac'], type: 'item', value: 1 } as unknown as RuleElement;

const UNTOUCHED =
  '{ "id": "00000000-0000-5000-8000-000000000002", "description": [{"type":"text","text":"x"}], "rules": [] }';
const HELD =
  '{ "id": "00000000-0000-5000-8000-000000000001", "description": [{"type":"text","text":"y"}],\n    "rules": [{"option":"a:b","key":"RollOption"}] }';

describe('mergeRulesIntoText', () => {
  test('adds the gained rules after the held ones and leaves every other byte as it was', () => {
    const text = `[\n  ${UNTOUCHED},\n  ${HELD}\n]\n`;
    const merge: RulesMerge = new Map([[ID, [toggle, modifier]]]);

    const result = mergeRulesIntoText(text, merge);

    expect(result).toBe(text.replace('"key":"RollOption"}]', `"key":"RollOption"}, ${JSON.stringify(modifier)}]`));
  });

  test('fills an empty rules list', () => {
    const text = `[${UNTOUCHED}]`;
    const result = mergeRulesIntoText(text, new Map([[OTHER, [modifier]]]));

    expect(JSON.parse(result)).toEqual([{ id: OTHER, description: [{ type: 'text', text: 'x' }], rules: [modifier] }]);
  });

  test('adds a rules key to an entry without one', () => {
    const text = '[{ "id": "00000000-0000-5000-8000-000000000001", "slug": "a" }\n]';
    const result = mergeRulesIntoText(text, new Map([[ID, [modifier]]]));

    expect(JSON.parse(result)).toEqual([{ id: ID, slug: 'a', rules: [modifier] }]);
  });

  test('returns the text itself when nothing is gained', () => {
    const text = `[${HELD}]`;

    expect(mergeRulesIntoText(text, new Map([[ID, [toggle]]]))).toBe(text);
  });
});
