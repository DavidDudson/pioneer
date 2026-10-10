import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { Predicate, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, constantFrom, integer, property, record, shuffledSubarray, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, feat, inputsOf, picked } from './testing/builders';

const ENTRIES_MAX = 12;
const TRAITS = ['fighter', 'rogue', 'general', 'flourish'] as const;
const LEVEL_MAX = 4;
const NAMES = ['Alpha', 'Beta', 'Gamma'] as const;
/** Levels the character may be, which a filter reads as `self:level`. */
const LEVELS = [1, 3] as const;
/** Situational facts a filter may read. */
const SITUATION = ['terrain:forest'] as const;

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
  readonly level: number;
  readonly situation: readonly string[];
}

const drawn: Arbitrary<Drawn> = integer({ min: 0, max: ENTRIES_MAX }).chain((count) =>
  tuple(
    tuple(...Array.from({ length: count }, (_value, index) => candidate(index))),
    array(statement, { maxLength: 3 }),
    constantFrom(...LEVELS),
    subarray([...SITUATION]),
  ).map(([feats, filter, level, situation]) => ({ feats, filter, level, situation })),
);

const factsOf = (options: readonly string[]): PredicateFacts =>
  new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );

function resolve({ feats, filter, level, situation }: Drawn): GrantResolution {
  const asker = entry('asker', [{ key: 'ChoiceSet', flag: 'pick', choices: { kind: 'feat', filter } }]);
  return resolveGrants(inputsOf({ entries: [asker, ...feats], roots: [picked('asker')], level, situation }));
}

/**
 * The filter on one candidate, read the long way: its options under `item:` beside the character's facts (its level,
 * the asking class feature and the situation).
 */
function truthFor(candidateFeat: GrantEntry, { filter, level, situation }: Drawn): Truth {
  const own = candidateFeat.rollOptions.map((option) => `item:${option}`);
  const character = [`self:level:${level}`, 'feature:asker', ...situation];
  return evaluatePredicate(Predicate.parse(filter), factsOf([...character, ...own]));
}

describe('choice query properties', () => {
  test('offers exactly the candidates whose filter is not false, marking the unknown ones', () => {
    assert(
      property(drawn, (draw) => {
        const [slot] = resolve(draw).open;
        const expected = draw.feats.filter((each) => truthFor(each, draw) !== Truth.False);
        expect(new Set(slot?.options.map((option) => option.value))).toEqual(new Set(expected.map((each) => each.id)));
        for (const option of slot?.options ?? []) {
          const found = draw.feats.find((each) => each.id === option.value);
          const unknown = found !== undefined && truthFor(found, draw) === Truth.Unknown;
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
        const options = resolve(draw).open[0]?.options ?? [];
        expect(resolve({ ...draw, feats: order }).open[0]?.options).toEqual(options);
        const keys = options.map((option) => `${option.label}\u0000${option.value}`);
        expect(keys).toEqual(keys.toSorted());
      }),
    );
  });
});
