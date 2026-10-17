import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { spellcastingInPlay } from './spellcasting-in-play';
import type { SpellcastingInPlay } from './spellcasting-in-play';
import { inPlay } from './testing';

const OAKEN_RESILIENCE = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const ILL_OMEN = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

const entry = (preparation: string, slug = 'grown-of-oak'): object => ({
  key: 'SpellcastingEntry',
  slug,
  tradition: 'primal',
  attribute: 'wis',
  preparation,
});

const innate = (
  spells: readonly (readonly [string | number, string])[],
  extra: object = {},
  on = 'grown-of-oak',
): object => ({
  key: 'InnateSpells',
  entry: on,
  spells: spells.map(([rank, spell]) => ({ rank, spell })),
  ...extra,
});

/** The innate spells of `caster`, each as its rank and the spell's id. */
function ranked(caster: SpellcastingInPlay | undefined): readonly (readonly [string | number, string])[] {
  return (caster?.innateSpells ?? []).map(({ rank, spell }) => [rank, String(spell)]);
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

describe('spellcastingInPlay: innate spells', () => {
  test('an innate entry has the spells of every innate spells element in play for it, each rank and spell once', () => {
    const [caster] = entriesOf([
      [entry('innate'), 'grown-of-oak'],
      [innate([[2, OAKEN_RESILIENCE]]), 'grown-of-oak'],
      [
        innate([
          [2, OAKEN_RESILIENCE],
          ['cantrip', ILL_OMEN],
        ]),
        'grown-of-oak',
      ],
    ]);

    expect(ranked(caster)).toStrictEqual([
      [2, OAKEN_RESILIENCE],
      ['cantrip', ILL_OMEN],
    ]);
  });

  test('the same spell at two ranks is two innate spells', () => {
    const [caster] = entriesOf([
      [entry('innate'), 'grown-of-oak'],
      [
        innate([
          [1, ILL_OMEN],
          [2, ILL_OMEN],
        ]),
        'grown-of-oak',
      ],
    ]);

    expect(caster?.innateSpells).toHaveLength(2);
  });

  test('an element gives its spells only while it holds', () => {
    const placed: (readonly [object, string])[] = [
      [entry('innate', 'fey-influence'), 'fey-influence'],
      [innate([[1, ILL_OMEN]], { predicate: ['fey-influence:cursed-bluebird'] }, 'fey-influence'), 'fey-influence'],
      [innate([[1, OAKEN_RESILIENCE]], { predicate: ['fey-influence:dryad'] }, 'fey-influence'), 'fey-influence'],
    ];

    expect(ranked(entriesOf(placed, ['fey-influence:cursed-bluebird'])[0])).toStrictEqual([[1, ILL_OMEN]]);
    expect(entriesOf(placed)[0]?.innateSpells).toStrictEqual([]);
  });

  test('a prepared entry, or one not in play, has no innate spells', () => {
    const entries = entriesOf([
      [entry('prepared', 'druid'), 'druid-spellcasting'],
      [innate([[1, ILL_OMEN]], {}, 'druid'), 'feat'],
      [innate([[1, OAKEN_RESILIENCE]], {}, 'dream-magic'), 'feat'],
    ]);

    expect(entries.map(({ slug, innateSpells }) => [String(slug), innateSpells])).toStrictEqual([['druid', []]]);
  });
});
