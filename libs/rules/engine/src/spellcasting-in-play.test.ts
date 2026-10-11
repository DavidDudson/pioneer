import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption, SLOT_COUNT_MAX } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { spellcastingInPlay } from './spellcasting-in-play';
import type { SpellcastingInPlay } from './spellcasting-in-play';
import { inPlay } from './testing';

const entry = (slug: string, tradition: string, extra: object = {}): object => ({
  key: 'SpellcastingEntry',
  slug,
  tradition,
  attribute: 'int',
  preparation: 'prepared',
  ...extra,
});

const HEAL = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const HARM = '5d7c2a91-0e4b-5f36-b8a2-1c9e4d7f0a63';
const FIREBALL = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

interface PoolSpellsFields {
  readonly entry: string;
  readonly pool: string;
  readonly spells: readonly string[];
}

const poolSpells = (fields: PoolSpellsFields, extra: object = {}): object => ({
  key: 'PoolSpells',
  ...fields,
  ...extra,
});

/** A divine font's spell, while the font picked is `option`. */
const fontSpell = (spell: string, option: string): object =>
  poolSpells({ entry: 'cleric', pool: 'divine-font', spells: [spell] }, { predicate: [option] });

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

describe('spellcastingInPlay', () => {
  test('each entry element gives an entry with its tradition, attribute, preparation and origin, in slug order', () => {
    const entries = entriesOf([
      [entry('wizard', 'arcane'), 'wizard-spellcasting'],
      [entry('first-world-magic', 'primal', { attribute: 'cha', preparation: 'innate' }), 'first-world-magic'],
    ]);

    expect(
      entries.map(({ slug, tradition, attribute, preparation }): string[] => [slug, tradition, attribute, preparation]),
    ).toEqual([
      ['first-world-magic', 'primal', 'cha', 'innate'],
      ['wizard', 'arcane', 'int', 'prepared'],
    ]);
    expect(entries[1]?.origin).toEqual(inPlay(entry('wizard', 'arcane'), 'wizard-spellcasting').origin);
  });

  test('two elements with one slug are one entry, the first one in play', () => {
    const entries = entriesOf([
      [entry('witch', 'occult', { predicate: ['feature:resentment'] }), 'resentment'],
      [entry('witch', 'primal'), 'wilding-steward'],
      [entry('witch', 'divine'), 'faiths-flamekeeper'],
    ]);

    expect(entries.map(({ slug, tradition }): string[] => [slug, tradition])).toEqual([['witch', 'primal']]);
  });

  test('an entry whose predicate fails or depends on the situation gives none', () => {
    const entries = entriesOf(
      [
        [entry('wizard', 'arcane', { predicate: ['class:wizard'] }), 'wizard-dedication'],
        [entry('bard', 'occult', { predicate: ['terrain:forest'] }), 'bard-dedication'],
      ],
      ['class:cleric'],
    );

    expect(entries).toEqual([]);
  });

  test('other rule elements give none', () => {
    expect(entriesOf([[{ key: 'Proficiency', selector: 'spellcasting', rank: 'expert' }, 'feat']])).toEqual([]);
  });
  test('an entry with no spell slots elements has no slots', () => {
    const [wizard] = entriesOf([[entry('wizard', 'arcane'), 'wizard-spellcasting']]);

    expect(wizard?.slots).toEqual({ ranks: [] });
    expect(wizard?.pools).toEqual([]);
  });
});

const slots = (entrySlug: string, [rank, value]: readonly [number | string, number], extra: object = {}): object => ({
  key: 'SpellSlots',
  entry: entrySlug,
  rank,
  value,
  ...extra,
});

const AT_THIRD = { predicate: [{ gte: ['self:level', 3] }] };
const AT_FIFTH = { predicate: [{ gte: ['self:level', 5] }] };

describe('spellcastingInPlay slots', () => {
  test('counts add up per rank, cantrips apart, lowest rank first, for the elements whose predicates hold', () => {
    const [wizard] = entriesOf(
      [
        [entry('wizard', 'arcane'), 'wizard-spellcasting'],
        [slots('wizard', [2, 2], AT_THIRD), 'wizard-spellcasting'],
        [slots('wizard', ['cantrip', 5]), 'wizard-spellcasting'],
        [slots('wizard', [1, 2]), 'wizard-spellcasting'],
        [slots('wizard', [1, 1], { predicate: [{ gte: ['self:level', 2] }] }), 'wizard-spellcasting'],
        [slots('wizard', [3, 2], AT_FIFTH), 'wizard-spellcasting'],
      ],
      ['self:level:3'],
    );

    expect<object | undefined>(wizard?.slots).toEqual({
      cantrips: 5,
      ranks: [
        { rank: 1, count: 3 },
        { rank: 2, count: 2 },
      ],
    });
  });

  test('slots for an entry not in play add nothing to the others', () => {
    const entries = entriesOf([
      [entry('wizard', 'arcane'), 'wizard-spellcasting'],
      [slots('wizard', [1, 2]), 'wizard-spellcasting'],
      [slots('cleric', [1, 1]), 'basic-cleric-spellcasting'],
    ]);

    expect(entries.map(({ slug, slots: own }): [string, object] => [slug, own])).toEqual([
      ['wizard', { ranks: [{ rank: 1, count: 2 }] }],
    ]);
  });

  test('a pool keeps its slots apart, named by the first entry that adds to it', () => {
    const curriculumCantrip = slots('wizard', ['cantrip', 1], { pool: 'curriculum' });
    const [wizard] = entriesOf([
      [entry('wizard', 'arcane'), 'wizard-spellcasting'],
      [slots('wizard', [1, 2]), 'wizard-spellcasting'],
      [curriculumCantrip, 'school-of-battle-magic'],
      [slots('wizard', [1, 1], { pool: 'curriculum' }), 'school-of-battle-magic'],
      [slots('wizard', [1, 1], { pool: 'bonded' }), 'bonded-item'],
    ]);

    expect<object | undefined>(wizard?.slots).toEqual({ ranks: [{ rank: 1, count: 2 }] });
    expect(wizard?.pools.map(({ pool, cantrips, ranks }): object => ({ pool, cantrips, ranks }))).toEqual([
      { pool: 'bonded', cantrips: undefined, ranks: [{ rank: 1, count: 1 }] },
      { pool: 'curriculum', cantrips: 1, ranks: [{ rank: 1, count: 1 }] },
    ]);
    expect(wizard?.pools[1]?.origin).toEqual(inPlay(curriculumCantrip, 'school-of-battle-magic', { rule: 2 }).origin);
  });

  test('the highest rank is the highest the entry’s own slots reach, whatever order the elements come in', () => {
    const [cleric] = entriesOf(
      [
        [entry('cleric', 'divine'), 'cleric-spellcasting'],
        [slots('cleric', ['highest', 4], { pool: 'divine-font' }), 'divine-font'],
        [slots('cleric', ['highest', 1], { pool: 'divine-font', ...AT_FIFTH }), 'divine-font'],
        [slots('cleric', [1, 3]), 'cleric-spellcasting'],
        [slots('cleric', [2, 2], AT_THIRD), 'cleric-spellcasting'],
        [slots('cleric', ['highest', 1]), 'cleric-spellcasting'],
        [slots('cleric', ['cantrip', 5]), 'cleric-spellcasting'],
      ],
      ['self:level:3'],
    );

    expect<object | undefined>(cleric?.slots).toEqual({
      cantrips: 5,
      ranks: [
        { rank: 1, count: 3 },
        { rank: 2, count: 3 },
      ],
    });
    expect(cleric?.pools.map(({ pool, ranks }): object => ({ pool, ranks }))).toEqual([
      { pool: 'divine-font', ranks: [{ rank: 2, count: 4 }] },
    ]);
  });

  test('the highest rank adds nothing to an entry with no slots of its own', () => {
    const [cleric] = entriesOf([
      [entry('cleric', 'divine'), 'cleric-dedication'],
      [slots('cleric', ['cantrip', 2]), 'cleric-dedication'],
      [slots('cleric', ['highest', 4], { pool: 'divine-font' }), 'divine-font'],
    ]);

    expect<object | undefined>(cleric?.slots).toEqual({ cantrips: 2, ranks: [] });
    expect(cleric?.pools).toEqual([]);
  });
  test('the highest rank is never 10th: 10th-rank slots take no abilities that add slots', () => {
    const [wizard] = entriesOf([
      [entry('wizard', 'arcane'), 'wizard-spellcasting'],
      [slots('wizard', [9, 3]), 'wizard-spellcasting'],
      [slots('wizard', [10, 1]), 'archwizards-spellcraft'],
      [slots('wizard', ['highest', 1], { pool: 'bonded' }), 'bonded-item'],
    ]);

    expect<object | undefined>(wizard?.pools.map(({ ranks }) => ranks)).toEqual([[{ rank: 9, count: 1 }]]);
  });
  test('a count past the most one rank holds is clamped there', () => {
    const many = Array.from({ length: 11 }, (_unused, rule): [object, string] => [
      slots('wizard', [1, 9]),
      `feat-${rule}`,
    ]);
    const [wizard] = entriesOf([[entry('wizard', 'arcane'), 'wizard-spellcasting'], ...many]);

    expect<object | undefined>(wizard?.slots).toEqual({ ranks: [{ rank: 1, count: SLOT_COUNT_MAX }] });
  });

  test('a pool takes the spells of every pool spells element in play for it, each once', () => {
    const curriculum = (spells: readonly string[]): object =>
      poolSpells({ entry: 'wizard', pool: 'curriculum', spells });
    const [wizard] = entriesOf([
      [entry('wizard', 'arcane'), 'wizard-spellcasting'],
      [slots('wizard', [1, 1], { pool: 'curriculum' }), 'school-of-battle-magic'],
      [curriculum([HEAL, FIREBALL]), 'school-of-battle-magic'],
      [curriculum([FIREBALL, HARM]), 'homebrew-feat'],
      [poolSpells({ entry: 'wizard', pool: 'bonded', spells: [HARM] }), 'bonded-item'],
      [poolSpells({ entry: 'cleric', pool: 'curriculum', spells: [HARM] }), 'cleric-feat'],
    ]);

    expect(wizard?.pools.map(({ pool, spells }): object => ({ pool, spells }))).toEqual([
      { pool: 'curriculum', spells: [HEAL, FIREBALL, HARM] },
    ]);
  });

  test('a pool takes only the spells whose element holds, and none without one', () => {
    const placed: (readonly [object, string])[] = [
      [entry('cleric', 'divine'), 'cleric-spellcasting'],
      [slots('cleric', [1, 2]), 'cleric-spellcasting'],
      [slots('cleric', ['highest', 4], { pool: 'divine-font' }), 'divine-font'],
      [fontSpell(HEAL, 'divine-font:heal'), 'divine-font'],
      [fontSpell(HARM, 'divine-font:harm'), 'divine-font'],
    ];
    const spellsOf = (options: readonly string[]): readonly string[] | undefined =>
      entriesOf(placed, options)[0]?.pools[0]?.spells;

    expect(spellsOf(['divine-font:harm'])).toEqual([HARM]);
    expect(spellsOf([])).toEqual([]);
  });
});
