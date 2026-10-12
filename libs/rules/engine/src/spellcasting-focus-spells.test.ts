import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { spellcastingInPlay } from './spellcasting-in-play';
import type { SpellcastingInPlay } from './spellcasting-in-play';
import { inPlay } from './testing';

const FIRE_RAY = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const HEALERS_BLESSING = '5d7c2a91-0e4b-5f36-b8a2-1c9e4d7f0a63';
const FLAME_BARRIER = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

const clericFocus = {
  key: 'SpellcastingEntry',
  slug: 'cleric-focus',
  tradition: 'divine',
  attribute: 'wis',
  preparation: 'focus',
};

const focusSpells = (spells: readonly string[], extra: object = {}): object => ({
  key: 'FocusSpells',
  entry: 'cleric-focus',
  spells,
  ...extra,
});

function entriesOf(
  placed: readonly (readonly [object, string])[],
  options: readonly string[] = [],
): SpellcastingInPlay[] {
  const rules = placed.map(([element, on], rule) => inPlay(element, on, { rule }));
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return [...spellcastingInPlay({ rules, facts })];
}

describe('spellcastingInPlay: focus spells', () => {
  test('a focus entry has the spells of every focus spells element in play for it, each once, in order', () => {
    const [focus] = entriesOf([
      [clericFocus, 'domain-initiate'],
      [focusSpells([FIRE_RAY, HEALERS_BLESSING]), 'domain-initiate'],
      [focusSpells([HEALERS_BLESSING, FLAME_BARRIER]), 'advanced-domain'],
    ]);

    expect(focus?.focusSpells.map(String)).toStrictEqual([FIRE_RAY, HEALERS_BLESSING, FLAME_BARRIER]);
    expect(focus?.slots).toStrictEqual({ ranks: [] });
  });

  test('a focus spells element gives its spells only while it holds', () => {
    const placed: (readonly [object, string])[] = [
      [clericFocus, 'domain-initiate'],
      [focusSpells([HEALERS_BLESSING], { predicate: ['domain-initiate:healing'] }), 'domain-initiate'],
      [focusSpells([FIRE_RAY], { predicate: ['domain-initiate:fire'] }), 'domain-initiate'],
    ];

    expect(entriesOf(placed, ['domain-initiate:fire'])[0]?.focusSpells.map(String)).toStrictEqual([FIRE_RAY]);
    expect(entriesOf(placed)[0]?.focusSpells).toStrictEqual([]);
  });

  test('an entry that is not a focus entry, or not in play, has no focus spells', () => {
    const cleric = { ...clericFocus, slug: 'cleric', preparation: 'prepared' };
    const entries = entriesOf([
      [cleric, 'cleric-spellcasting'],
      [{ key: 'FocusSpells', entry: 'cleric', spells: [FIRE_RAY] }, 'domain-initiate'],
      [{ key: 'FocusSpells', entry: 'druid-focus', spells: [FLAME_BARRIER] }, 'untamed-order'],
    ]);

    expect(entries.map(({ slug, focusSpells: spells }) => [String(slug), spells])).toStrictEqual([['cleric', []]]);
  });
});
