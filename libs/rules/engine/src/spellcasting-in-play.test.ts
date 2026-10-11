import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
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
    expect(entriesOf([[{ key: 'Proficiency', selector: 'spellcasting:arcane', rank: 'expert' }, 'feat']])).toEqual([]);
  });
});
