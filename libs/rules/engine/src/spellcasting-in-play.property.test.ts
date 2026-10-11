import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, integer, oneof, option, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ranksInPlay, SPELLCASTING } from './ranks-in-play';
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

/** A `SpellcastingEntry`, or a `Proficiency` raise of the spellcasting rank. */
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
      : { key: 'Proficiency', selector: 'spellcasting', rank, ...predicate };
    return inPlay(element, 'feature', { rule });
  });
}

const POOLS = ['curriculum', 'divine-font'] as const;
const RANK_MAX = 10;
const VALUE_MAX = 5;

/** An ungated entry of each slug. */
const ENTRIES: readonly RuleInPlay[] = rulesOf(
  SLUGS.map((slug): Placed => ({ entry: true, slug, tradition: 'arcane', rank: 'trained', gated: false })),
);

/** A `SpellSlots` element of a fixed rank, cantrips or `highest`, maybe in a pool, maybe for an entry not in play. */
interface PlacedSlots {
  readonly entry: (typeof SLUGS)[number] | 'druid';
  readonly rank: number | 'cantrip' | 'highest';
  readonly value: number;
  readonly pool: (typeof POOLS)[number] | undefined;
  readonly gated: boolean;
}

const placedSlots: Arbitrary<PlacedSlots> = record({
  entry: constantFrom(...SLUGS, 'druid'),
  rank: oneof(integer({ min: 1, max: RANK_MAX }), constantFrom('cantrip' as const, 'highest' as const)),
  value: integer({ min: 1, max: VALUE_MAX }),
  pool: option(constantFrom(...POOLS), { nil: undefined }),
  gated: boolean(),
});

function slotRulesOf(elements: readonly PlacedSlots[]): RuleInPlay[] {
  return elements.map(({ entry, rank, value, pool, gated }, rule) => {
    const inPool = pool === undefined ? {} : { pool };
    const predicate = gated ? { predicate: AT_FIFTH } : {};
    return inPlay({ key: 'SpellSlots', entry, rank, value, ...inPool, ...predicate }, 'feature', { rule });
  });
}

/** Slots as the model writes them: cantrips when there are any, then counts by rank. */
interface Modelled {
  readonly cantrips?: number;
  readonly ranks: readonly { readonly rank: number; readonly count: number }[];
}

function slotsWith(cantrips: number | undefined, ranks: Modelled['ranks']): Modelled {
  return cantrips === undefined ? { ranks } : { cantrips, ranks };
}

/** The key the model keeps an entry's own slots under, apart from its pools. */
const OWN = '';

/**
 * What an entry's ungated elements should give, worked out plainly: `highest` is the highest fixed own rank below
 * 10th, or nothing without one; counts add up per pool and rank.
 */
function modelSlots(live: readonly PlacedSlots[]): Map<string, Modelled> {
  const fixedOwn = live.flatMap(({ pool, rank }) => (pool === undefined && typeof rank === 'number' ? [rank] : []));
  const belowTenth = fixedOwn.filter((rank) => rank < RANK_MAX);
  const highest = belowTenth.length === 0 ? undefined : Math.max(...belowTenth);
  const tallies = new Map<string, Map<number | 'cantrip', number>>();
  for (const { pool, rank, value } of live) {
    const resolved = rank === 'highest' ? highest : rank;
    if (resolved !== undefined) {
      const tally = tallies.get(pool ?? OWN) ?? new Map<number | 'cantrip', number>();
      tally.set(resolved, (tally.get(resolved) ?? 0) + value);
      tallies.set(pool ?? OWN, tally);
    }
  }
  return new Map(
    [...tallies].map(([pool, tally]): [string, Modelled] => {
      const ranks = [...tally]
        .flatMap(([rank, count]) => (rank === 'cantrip' ? [] : [{ rank, count }]))
        .toSorted((left, right) => left.rank - right.rank);
      return [pool, slotsWith(tally.get('cantrip'), ranks)];
    }),
  );
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

  test('an entry in play trains spellcasting, whatever its tradition, and the highest raise that holds wins', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const live = elements.filter(({ gated }) => !gated);
        const reached = live.map(({ entry, rank }) => RANKS.indexOf(entry ? 'trained' : rank));
        const expected = reached.length === 0 ? undefined : RANKS[Math.max(...reached)];

        expect(ranksInPlay({ rules: rulesOf(elements), facts }).get(SPELLCASTING)).toBe(expected);
      }),
    );
  });
  test('own slots and each pool count the ungated slots for their entry, never another entry’s or pool’s', () => {
    assert(
      property(array(placedSlots, { maxLength: ELEMENTS_MAX }), (placedList) => {
        const entries = spellcastingInPlay({ rules: [...ENTRIES, ...slotRulesOf(placedList)], facts });

        for (const { slug, slots, pools } of entries) {
          const expected = modelSlots(placedList.filter((each) => each.entry === slug && !each.gated));

          expect<Modelled>(slots).toEqual(expected.get(OWN) ?? { ranks: [] });
          expect<[string, Modelled][]>(
            pools.map(({ pool, cantrips, ranks }) => [pool, slotsWith(cantrips, ranks)]),
          ).toEqual(
            [...expected].filter(([pool]) => pool !== OWN).toSorted(([left], [right]) => (left < right ? -1 : 1)),
          );
        }
      }),
    );
  });
});
