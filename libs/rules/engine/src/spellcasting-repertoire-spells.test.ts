import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { spellcastingInPlay } from './spellcasting-in-play';
import type { SpellcastingInPlay } from './spellcasting-in-play';
import { inPlay } from './testing';

const DAZZLING_FLASH = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const HEAL = '5d7c2a91-0e4b-5f36-b8a2-1c9e4d7f0a63';
const FEAR = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

const entry = (preparation: string, slug = 'sorcerer'): object => ({
  key: 'SpellcastingEntry',
  slug,
  tradition: 'divine',
  attribute: 'cha',
  preparation,
});

const gifts = (
  spells: readonly (readonly [string | number, string])[],
  extra: object = {},
  on = 'sorcerer',
): object => ({
  key: 'RepertoireSpells',
  entry: on,
  spells: spells.map(([rank, spell]) => ({ rank, spell })),
  ...extra,
});

/** The gifts of `entry`, each as its rank and the spell's id. */
function ranked(caster: SpellcastingInPlay | undefined): readonly (readonly [string | number, string])[] {
  return (caster?.grantedSpells ?? []).map(({ rank, spell }) => [rank, String(spell)]);
}

function entriesOf(
  placed: readonly (readonly [object, string])[],
  options: readonly string[] = [],
): SpellcastingInPlay[] {
  const rules = placed.map(([element, source], rule) => inPlay(element, source, { rule }));
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return [...spellcastingInPlay({ rules, facts })];
}

describe('spellcastingInPlay: repertoire spells', () => {
  test('a spontaneous entry has the spells of every repertoire spells element in play for it, each once, in order', () => {
    const [sorcerer] = entriesOf([
      [entry('spontaneous'), 'sorcerer-spellcasting'],
      [
        gifts([
          ['cantrip', DAZZLING_FLASH],
          [1, HEAL],
        ]),
        'bloodline',
      ],
      [
        gifts([
          [1, HEAL],
          [2, FEAR],
        ]),
        'bloodline',
      ],
    ]);

    expect(ranked(sorcerer)).toStrictEqual([
      ['cantrip', DAZZLING_FLASH],
      [1, HEAL],
      [2, FEAR],
    ]);
  });

  test('the same spell at two ranks is two gifts', () => {
    const [sorcerer] = entriesOf([
      [entry('spontaneous'), 'sorcerer-spellcasting'],
      [
        gifts([
          [1, HEAL],
          [2, HEAL],
        ]),
        'bloodline',
      ],
    ]);

    expect(sorcerer?.grantedSpells).toHaveLength(2);
  });

  test('an element gives its spells only while it holds', () => {
    const placed: (readonly [object, string])[] = [
      [entry('spontaneous'), 'sorcerer-spellcasting'],
      [gifts([[2, FEAR]], { predicate: ['draconic-exemplar:diabolic'] }), 'bloodline-draconic'],
      [gifts([[2, HEAL]], { predicate: ['draconic-exemplar:imperial'] }), 'bloodline-draconic'],
    ];

    expect(ranked(entriesOf(placed, ['draconic-exemplar:imperial'])[0])).toStrictEqual([[2, HEAL]]);
    expect(entriesOf(placed)[0]?.grantedSpells).toStrictEqual([]);
  });

  test('a prepared entry, or one not in play, has no repertoire spells', () => {
    const entries = entriesOf([
      [entry('prepared', 'wizard'), 'wizard-spellcasting'],
      [gifts([[1, HEAL]], {}, 'wizard'), 'bloodline'],
      [gifts([[1, FEAR]], {}, 'oracle'), 'mystery'],
    ]);

    expect(entries.map(({ slug, grantedSpells }) => [String(slug), grantedSpells])).toStrictEqual([['wizard', []]]);
  });
});
