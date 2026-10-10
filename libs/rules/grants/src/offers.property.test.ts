import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { Predicate, RollOptionNamespace } from '@pioneer/rules/sdk';
import {
  array,
  assert,
  constantFrom,
  integer,
  oneof,
  option,
  pre,
  property,
  record,
  subarray,
  tuple,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { ChoiceSlot } from './choices';
import type { GrantEntry } from './grant-entry';
import { GrantsMessage } from './messages';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, feat, idOf, inputsOf, picked, picksOf, slotOf } from './testing/builders';

/*
 * A slot works out its offer only when read, and an answered slot checks its pick alone. These compare both with
 * the offer worked out in full against the facts resolution settled on, including facts the pick itself sets.
 */

const ENTRIES_MAX = 8;
const TRAITS = ['fighter', 'rogue', 'general'] as const;
const LEVEL_MAX = 4;
const LEVELS = [1, 3] as const;
const LISTED = ['a', 'b', 'c'] as const;
/** A slug that is no content id. */
const NOT_AN_ID = 'not-an-id';
const UNSETTLED: ReadonlySet<string> = new Set([GrantsMessage.Oscillates, GrantsMessage.TooManyRounds]);
const CANDIDATE_NAMESPACE = RollOptionNamespace.parse('item');

/** A statement on the character: its level, a feat it may have picked, or the situation. */
const characterStatement: Arbitrary<unknown> = constantFrom<unknown>(
  { gte: ['self:level', 2] },
  'feat:feat-0',
  { not: 'feat:feat-1' },
  'terrain:forest',
);

/** A statement of a query filter: the candidate's own options, or the character's. */
const filterStatement: Arbitrary<unknown> = oneof(
  characterStatement,
  constantFrom<unknown>(
    ...TRAITS.map((trait) => `item:trait:${trait}`),
    { not: 'item:trait:general' },
    { lte: ['item:level', 'self:level'] },
  ),
);

const candidate = (index: number): Arbitrary<GrantEntry> =>
  record({ traits: subarray([...TRAITS]), level: integer({ min: 1, max: LEVEL_MAX }) }).map(({ traits, level }) =>
    feat(`feat-${index}`, [...traits.map((trait) => `trait:${trait}`), `level:${level}`]),
  );

const feats: Arbitrary<readonly GrantEntry[]> = integer({ min: 0, max: ENTRIES_MAX }).chain((count) =>
  tuple(...Array.from({ length: count }, (_value, index) => candidate(index))),
);

/** The settled resolution's slot, answered or open, and whether it was answered. */
interface Outcome {
  readonly slot: ChoiceSlot | undefined;
  readonly answered: boolean;
  readonly facts: PredicateFacts;
}

/** One run: the asking entry, the other content, the level and the pick for the asker's only slot. */
interface Run {
  readonly asker: GrantEntry;
  readonly content: readonly GrantEntry[];
  readonly level: number;
  readonly pick: string;
}

/** Resolves `run`; skips one that never settles, whose facts are a compromise. */
function outcomeOf({ asker, content, level, pick }: Run): Outcome {
  const picks = picksOf([[slotOf('asker', 0), pick]]);
  const given = inputsOf({ entries: [asker, ...content], roots: [picked('asker')], level, picks });
  const result: GrantResolution = resolveGrants(given);
  pre(!result.errors.some(({ error }) => UNSETTLED.has(error.key)));
  const [answered] = result.answered;
  return { slot: answered ?? result.open[0], answered: answered !== undefined, facts: result.facts };
}

const notFalse = (predicate: unknown, facts: PredicateFacts): boolean =>
  evaluatePredicate(Predicate.parse(predicate), facts) !== Truth.False;

describe('offer properties', () => {
  test('a query slot answers a pick exactly when its full offer has it, and offers the same either way', () => {
    const drawn = tuple(
      feats,
      array(filterStatement, { maxLength: 3 }),
      constantFrom(...LEVELS),
      option(integer({ min: 0, max: ENTRIES_MAX + 1 })),
    );
    assert(
      property(drawn, ([content, filter, level, at]) => {
        const asker = entry('asker', [
          { key: 'ChoiceSet', flag: 'pick', choices: { kind: 'feat', filter } },
          { key: 'GrantItem', item: { choice: 'pick' } },
        ]);
        // A feat, the asker itself (not a feat), an id nothing has, or text that is no id.
        const values = [...content.map((each) => each.id), idOf('asker'), idOf('missing')];
        const pick = at === null ? NOT_AN_ID : (values[at % values.length] ?? NOT_AN_ID);
        const { slot, answered, facts } = outcomeOf({ asker, content, level, pick });
        const offered = content
          .filter((each) => notFalse(filter, facts.withNamespace(CANDIDATE_NAMESPACE, each.rollOptions)))
          .map((each) => String(each.id));
        expect(answered).toBe(offered.includes(pick));
        expect(new Set(slot?.options.map((each) => String(each.value)))).toEqual(new Set(offered));
      }),
    );
  });

  test('a listed slot answers a pick exactly when its full offer has it, and offers the same either way', () => {
    const drawn = tuple(
      feats,
      array(option(characterStatement), { minLength: LISTED.length, maxLength: LISTED.length }),
      constantFrom(...LEVELS),
      constantFrom<string>(...LISTED, NOT_AN_ID),
    );
    assert(
      property(drawn, ([content, predicates, level, pick]) => {
        const choices = LISTED.map((value, at) => {
          const predicate = predicates[at];
          return predicate === null || predicate === undefined
            ? { value, label: value }
            : { value, label: value, predicate: [predicate] };
        });
        const asker = entry('asker', [{ key: 'ChoiceSet', flag: 'pick', choices }]);
        const { slot, answered, facts } = outcomeOf({ asker, content, level, pick });
        const offered = choices
          .filter((choice) => !('predicate' in choice) || notFalse(choice.predicate, facts))
          .map((choice) => choice.value);
        expect(answered).toBe(offered.some((value) => value === pick));
        expect(slot?.options.map((each) => String(each.value))).toEqual(offered);
      }),
    );
  });
});
