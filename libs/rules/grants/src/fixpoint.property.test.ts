import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { RuleElementKey } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, oneof, property, record, shuffledSubarray, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry } from './grant-entry';
import { GrantsMessage } from './messages';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, grantOf, idOf, inputsOf, picked } from './testing/builders';

const ENTRIES_MAX = 10;
const LEVEL_MAX = 5;
const UNSETTLED: ReadonlySet<string> = new Set([GrantsMessage.Oscillates, GrantsMessage.TooManyRounds]);

const slugOf = (index: number): string => `entry-${index}`;
const indexes = (count: number): number[] => Array.from({ length: count }, (_value, index) => index);

/**
 * A predicate that only asks for facts, never for their absence: another entry on the character, or a level. Grants
 * gated this way only ever add to the set as facts arrive.
 */
function positivePredicate(count: number): Arbitrary<unknown[] | undefined> {
  const statement = oneof(
    integer({ min: 0, max: count - 1 }).map((index): unknown => `feature:${slugOf(index)}`),
    integer({ min: 1, max: LEVEL_MAX }).map((level): unknown => ({ gte: ['self:level', level] })),
  );
  return oneof(constantFrom(undefined), tuple(statement), tuple(statement, statement));
}

/** Entry `index`, granting some later entries (so grants never loop), each grant gated by a positive predicate. */
function entryAt(index: number, count: number): Arbitrary<GrantEntry> {
  const later = indexes(count).slice(index + 1);
  return subarray(later).chain((targets) =>
    tuple(...targets.map(() => positivePredicate(count))).map((predicates) =>
      entry(
        slugOf(index),
        targets.map((target, at) => {
          const predicate = predicates[at];
          return predicate === undefined ? grantOf(slugOf(target)) : { ...grantOf(slugOf(target)), predicate };
        }),
      ),
    ),
  );
}

interface Drawn {
  readonly content: readonly GrantEntry[];
  readonly roots: readonly number[];
  readonly level: number;
}

const monotone: Arbitrary<Drawn> = integer({ min: 1, max: ENTRIES_MAX }).chain((count) =>
  record({
    content: tuple(...indexes(count).map((index) => entryAt(index, count))),
    roots: subarray(indexes(count), { minLength: 1 }),
    level: integer({ min: 1, max: LEVEL_MAX }),
  }),
);

function resolve({ content, roots, level }: Drawn): GrantResolution {
  return resolveGrants(inputsOf({ entries: content, roots: roots.map((index) => picked(slugOf(index))), level }));
}

describe('resolveGrants fixpoint properties', () => {
  test('grants gated only on facts that arrive always settle, and every grant that holds is followed', () => {
    assert(
      property(monotone, (drawn) => {
        const result = resolve(drawn);
        expect(result.errors.filter((failed) => UNSETTLED.has(failed.error.key))).toEqual([]);
        const present = new Set(result.items.map((item) => item.entry.id));
        for (const { entry: on } of result.items) {
          for (const element of on.rules) {
            const holds =
              element.key === RuleElementKey.GrantItem &&
              (element.predicate === undefined || evaluatePredicate(element.predicate, result.facts) === Truth.True);
            if (holds && typeof element.item === 'string') {
              expect(present.has(element.item)).toBe(true);
            }
          }
        }
      }),
    );
  });

  test('the fixpoint does not depend on the order the roots are given in', () => {
    const shuffled = monotone.chain((drawn) =>
      shuffledSubarray([...drawn.roots], { minLength: drawn.roots.length }).map((order) => ({ drawn, order })),
    );
    assert(
      property(shuffled, ({ drawn, order }) => {
        expect(resolve({ ...drawn, roots: order })).toEqual(resolve(drawn));
      }),
    );
  });

  test('every entry on the character sets its option', () => {
    assert(
      property(monotone, (drawn) => {
        const result = resolve(drawn);
        for (const { entry: on } of result.items) {
          expect(result.facts.has(`feature:${on.slug}`)).toBe(true);
        }
        const ids = new Set(result.items.map((item) => item.entry.id));
        for (const root of drawn.roots) {
          const id = idOf(slugOf(root));
          expect(ids.has(id)).toBe(true);
        }
      }),
    );
  });
});
