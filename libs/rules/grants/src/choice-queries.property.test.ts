import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { Predicate, RollOption } from '@pioneer/rules/sdk';
import { array, assert, constantFrom, integer, property, record, shuffledSubarray, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, feat, lookupOf, picked, picksOf } from './testing/builders';

const ENTRIES_MAX = 12;
const TRAITS = ['fighter', 'rogue', 'general', 'flourish'] as const;
const LEVEL_MAX = 4;
const NAMES = ['Alpha', 'Beta', 'Gamma'] as const;
/** Character facts a filter may read: known (`self:level`) and situational (`terrain`). */
const FACTS = ['self:level:1', 'self:level:3', 'terrain:forest'] as const;

/** One statement of a filter, over the candidate's options, the character's level or the situation. */
const statement: Arbitrary<unknown> = constantFrom<unknown>(
  ...TRAITS.map((trait) => `item:trait:${trait}`),
  { not: 'item:trait:general' },
  { lte: ['item:level', 'self:level'] },
  { gte: ['item:level', 2] },
  'terrain:forest',
  { or: ['item:trait:rogue', 'terrain:swamp'] },
);

/** A feat with some traits and a level; names repeat so the id breaks ties. */
const candidate = (index: number): Arbitrary<GrantEntry> =>
  record({
    traits: subarray([...TRAITS]),
    level: integer({ min: 1, max: LEVEL_MAX }),
    name: constantFrom(...NAMES),
  }).map(({ traits, level, name }) =>
    feat(`feat-${index}`, [...traits.map((trait) => `trait:${trait}`), `level:${level}`], name),
  );

interface Drawn {
  readonly feats: readonly GrantEntry[];
  readonly filter: readonly unknown[];
  readonly facts: readonly string[];
}

const drawn: Arbitrary<Drawn> = integer({ min: 0, max: ENTRIES_MAX }).chain((count) =>
  tuple(
    tuple(...Array.from({ length: count }, (_value, index) => candidate(index))),
    array(statement, { maxLength: 3 }),
    subarray([...FACTS]),
  ).map(([feats, filter, facts]) => ({ feats, filter, facts })),
);

const factsOf = (options: readonly string[]): PredicateFacts =>
  new PredicateFacts(options.map((option) => RollOption.parse(option)));

function resolve(feats: readonly GrantEntry[], filter: readonly unknown[], facts: readonly string[]): GrantResolution {
  const asker = entry('asker', [{ key: 'ChoiceSet', flag: 'pick', choices: { kind: 'feat', filter } }]);
  return resolveGrants({
    roots: [picked('asker')],
    lookup: lookupOf([asker, ...feats]),
    facts: factsOf(facts),
    picks: picksOf(),
  });
}

/** The filter on one candidate, read the long way: its options under `item:` beside the character's facts. */
function truthFor(candidateFeat: GrantEntry, filter: readonly unknown[], facts: readonly string[]): Truth {
  const own = candidateFeat.rollOptions.map((option) => `item:${option}`);
  return evaluatePredicate(Predicate.parse(filter), factsOf([...facts, ...own]));
}

describe('choice query properties', () => {
  test('offers exactly the candidates whose filter is not false, marking the unknown ones', () => {
    assert(
      property(drawn, ({ feats, filter, facts }) => {
        const [slot] = resolve(feats, filter, facts).open;
        const expected = feats.filter((each) => truthFor(each, filter, facts) !== Truth.False);
        expect(new Set(slot?.options.map((option) => option.value))).toEqual(new Set(expected.map((each) => each.id)));
        for (const option of slot?.options ?? []) {
          const found = feats.find((each) => each.id === option.value);
          const unknown = found !== undefined && truthFor(found, filter, facts) === Truth.Unknown;
          expect(option.summary !== undefined).toBe(unknown);
        }
      }),
    );
  });

  test('the offer is sorted and does not depend on the order content lists the candidates in', () => {
    const shuffled = drawn.chain((draw) =>
      shuffledSubarray([...draw.feats], { minLength: draw.feats.length }).map((order) => ({ draw, order })),
    );
    assert(
      property(shuffled, ({ draw, order }) => {
        const options = resolve(draw.feats, draw.filter, draw.facts).open[0]?.options ?? [];
        expect(resolve(order, draw.filter, draw.facts).open[0]?.options).toEqual(options);
        const keys = options.map((option) => `${option.label}\u0000${option.value}`);
        expect(keys).toEqual(keys.toSorted());
      }),
    );
  });
});
