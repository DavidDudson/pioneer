import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');
const LANG = { PF2E: { Note: { Hit: 'Deals <strong>2</strong> more damage.' } } };

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: LANG, values: { item: 'Explosive Ammunition' } });
}

describe('Note from Foundry', () => {
  test('plain text is a paragraph, and the item name heads the note', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.Note,
      outcome: ['success', 'criticalSuccess'],
      predicate: ['action:feint'],
      selector: 'skill-check',
      text: 'The target is off-guard.',
      title: '{item|name}',
    });

    expect(untranslated).toEqual([]);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      key: RuleElementKey.Note,
      outcome: ['success', 'criticalSuccess'],
      predicate: ['action:feint'],
      selectors: ['skill-check'],
      title: 'Explosive Ammunition',
    });
    expect(JSON.stringify(rules[0])).toContain('The target is off-guard.');
  });

  test('a lang key for the text is its English HTML, marks kept', () => {
    const { rules, untranslated } = translated({
      key: RuleElementKey.Note,
      selector: 'strike-damage',
      text: 'PF2E.Note.Hit',
    });

    expect(untranslated).toEqual([]);
    expect(JSON.stringify(rules[0])).toContain('more damage.');
  });

  test('a note read from the item, or aimed at it, stays', () => {
    const description = translated({ key: RuleElementKey.Note, selector: 'x', text: '{item|description}' });
    const own = translated({ key: RuleElementKey.Note, selector: '{item|_id}-damage', text: 'More.' });

    expect([description, own].map(({ untranslated }) => untranslated.length)).toEqual([1, 1]);
  });
});
