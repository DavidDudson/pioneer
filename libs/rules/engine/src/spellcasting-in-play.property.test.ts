import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ranksInPlay, spellcastingSelector } from './ranks-in-play';
import type { RuleInPlay } from './rule-in-play';
import { spellcastingInPlay } from './spellcasting-in-play';
import { inPlay } from './testing';

const SLUGS = ['bard', 'cleric', 'witch', 'wizard'] as const;
const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const;
const RANKS = ['trained', 'expert', 'master', 'legendary'] as const;
const ELEMENTS_MAX = 12;
/** Holds from 5th level, so fails for the 1st-level character these properties use. */
const AT_FIFTH = [{ gte: ['self:level', 5] }];
const facts = new PredicateFacts([RollOption.parse('self:level:1')], CORE_NAMESPACES);

/** A `SpellcastingEntry`, or a `Proficiency` raise of a tradition's rank. */
interface Placed {
  readonly entry: boolean;
  readonly slug: (typeof SLUGS)[number];
  readonly tradition: (typeof TRADITIONS)[number];
  readonly rank: (typeof RANKS)[number];
  /** Behind a predicate that fails at 1st level. */
  readonly gated: boolean;
}

const placed: Arbitrary<Placed> = record({
  entry: boolean(),
  slug: constantFrom(...SLUGS),
  tradition: constantFrom(...TRADITIONS),
  rank: constantFrom(...RANKS),
  gated: boolean(),
});

function rulesOf(elements: readonly Placed[]): RuleInPlay[] {
  return elements.map(({ entry, slug, tradition, rank, gated }, rule) => {
    const predicate = gated ? { predicate: AT_FIFTH } : {};
    const element = entry
      ? { key: 'SpellcastingEntry', slug, tradition, attribute: 'int', preparation: 'prepared', ...predicate }
      : { key: 'Proficiency', selector: `spellcasting:${tradition}`, rank, ...predicate };
    return inPlay(element, 'feature', { rule });
  });
}

describe('spellcastingInPlay (properties)', () => {
  test('one entry per slug an ungated element names, in slug order, from the first such element', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const live = elements.filter(({ entry, gated }) => entry && !gated);
        const expected = [...new Set(live.map(({ slug }) => slug))].toSorted().map((slug): string[] => {
          const first = live.find((each) => each.slug === slug);
          return [slug, String(first?.tradition)];
        });

        const entries = spellcastingInPlay({ rules: rulesOf(elements), facts });

        expect(entries.map(({ slug, tradition }): string[] => [slug, tradition])).toEqual(expected);
      }),
    );
  });

  test('each tradition with an entry in play is at least trained, and raised to the highest raise that holds', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const ranks = ranksInPlay({ rules: rulesOf(elements), facts });
        for (const tradition of TRADITIONS) {
          const live = elements.filter((each) => each.tradition === tradition && !each.gated);
          const reached = live.map(({ entry, rank }) => RANKS.indexOf(entry ? 'trained' : rank));
          const expected = reached.length === 0 ? undefined : RANKS[Math.max(...reached)];
          expect(ranks.get(spellcastingSelector(tradition))).toBe(expected);
        }
      }),
    );
  });
});
