import { describe, expect, test } from 'bun:test';

import { ContentId, EntrySlug } from '@pioneer/rules/sdk';

import { NO_REFERENCES } from './entry-references';
import type { EntryReferences } from './entry-references';
import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');
const BREATH = ContentId.parse('00000000-0000-5000-8000-000000000001');
const BREATH_UUID = 'Compendium.pf2e.actionspf2e.Item.Dragon Breath (Dragon Form)';
const GRANTED = '{item|flags.system.itemGrants.dragonBreath.id}';

const references: EntryReferences = {
  ...NO_REFERENCES,
  byUuid: new Map([[BREATH_UUID, BREATH]]),
  bySlug: new Map([[EntrySlug.parse('action:dragon-breath-dragon-form'), BREATH]]),
};

const grant = { key: 'GrantItem', flag: 'dragonBreath', uuid: BREATH_UUID };

function translated(...raws: readonly object[]): RuleTranslation {
  return translateRules(ENTRY, [grant, ...raws], { lang: {}, values: { item: '' }, references });
}

describe('Alterations of a granted item from Foundry', () => {
  test('the grant keeps its flag in Pioneer’s spelling', () => {
    const { rules, untranslated } = translated();

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([{ key: 'GrantItem', item: BREATH, flag: 'dragon-breath' }]);
  });

  test('an ItemAlteration by itemId reaches the granted action by its slug', () => {
    const { rules, untranslated } = translated({
      key: 'ItemAlteration',
      itemId: GRANTED,
      mode: 'add',
      property: 'traits',
      value: 'fire',
      predicate: ['dragon-form:magma'],
    });

    expect(untranslated).toEqual([]);
    expect(last(rules)).toEqual({
      key: 'ItemAlteration',
      mode: 'add',
      property: 'traits',
      value: 'fire',
      items: ['item:slug:dragon-breath-dragon-form'],
      predicate: ['dragon-form:magma'],
    });
  });

  test('a DamageAlteration of its inline damage is an ItemAlteration of its damage type', () => {
    const { rules, untranslated } = translated({
      key: 'DamageAlteration',
      mode: 'override',
      property: 'damage-type',
      selectors: [`${GRANTED}-inline-damage`],
      value: 'fire',
    });

    expect(untranslated).toEqual([]);
    expect(last(rules)).toEqual({
      key: 'ItemAlteration',
      mode: 'override',
      property: 'damage-type',
      value: 'fire',
      items: ['item:slug:dragon-breath-dragon-form'],
    });
  });

  test('extra dice from a rank are a formula of the rank, with no predicate on the character', () => {
    const { rules, untranslated } = translated({
      key: 'DamageAlteration',
      mode: 'add',
      predicate: [{ gte: ['parent:level', 8] }],
      property: 'dice-number',
      selectors: [`${GRANTED}-inline-damage`],
      value: 4,
    });

    expect(untranslated).toEqual([]);
    expect(last(rules)).toEqual({
      key: 'ItemAlteration',
      mode: 'add',
      property: 'damage-dice',
      value: 'ternary(gte(@item.level, 8), 4, 0)',
      items: ['item:slug:dragon-breath-dragon-form'],
    });
  });

  test('a description override is rich text', () => {
    const { rules, untranslated } = translated({
      key: 'ItemAlteration',
      itemId: GRANTED,
      mode: 'override',
      property: 'description',
      value: [{ text: 'You exhale fire.' }],
    });

    expect(untranslated).toEqual([]);
    expect(rules.at(-1)).toMatchObject({
      property: 'description',
      value: [{ type: 'paragraph', content: [{ type: 'text', text: 'You exhale fire.' }] }],
    });
  });
});

/** The last of `rules`, its type forgotten, so that a test compares it with a plain object. */
function last(rules: readonly unknown[]): unknown {
  return rules.at(-1);
}
