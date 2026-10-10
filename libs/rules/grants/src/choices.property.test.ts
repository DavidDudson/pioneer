import { describe, expect, test } from 'bun:test';

import { OriginHopKind } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, option, property, shuffledSubarray, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, grantOf, idOf, inputsOf, picked, picksOf, slotOf } from './testing/builders';

const ENTRIES_MAX = 8;
const FLAG = 'pick';

const slugOf = (index: number): string => `entry-${index}`;
const indexes = (count: number): number[] => Array.from({ length: count }, (_value, index) => index);

/** Entry `index`: fixed grants of some later entries, and maybe a choice of later entries at rule 0. */
interface Shape {
  readonly grants: readonly number[];
  readonly offers: readonly number[] | undefined;
}

function shapeAt(index: number, count: number): Arbitrary<Shape> {
  const later = indexes(count).slice(index + 1);
  const offers =
    later.length === 0 ? constantFrom(undefined) : option(subarray(later, { minLength: 1 }), { nil: undefined });
  return tuple(subarray(later), offers).map(([grants, offered]) => ({ grants, offers: offered }));
}

function entryOf(index: number, { grants, offers }: Shape): GrantEntry {
  const choice =
    offers === undefined
      ? []
      : [
          {
            key: 'ChoiceSet',
            flag: FLAG,
            choices: offers.map((target) => ({ value: idOf(slugOf(target)), label: slugOf(target) })),
          },
          { key: 'GrantItem', item: { choice: FLAG } },
        ];
  return entry(slugOf(index), [...choice, ...grants.map((target) => grantOf(slugOf(target)))]);
}

/** Acyclic content with choices, some roots, and a pick (its first offer) for every slot that has one. */
interface Drawn {
  readonly content: readonly GrantEntry[];
  readonly roots: readonly number[];
  readonly picks: readonly (readonly [SlotKey, string])[];
}

const drawn: Arbitrary<Drawn> = integer({ min: 1, max: ENTRIES_MAX }).chain((count) =>
  tuple(tuple(...indexes(count).map((index) => shapeAt(index, count))), subarray(indexes(count), { minLength: 1 })).map(
    ([shapes, roots]) => ({
      content: shapes.map((shape, index) => entryOf(index, shape)),
      roots,
      picks: shapes.flatMap((shape, index): [SlotKey, string][] => {
        const first = shape.offers?.[0];
        return first === undefined ? [] : [[slotOf(slugOf(index), 0), idOf(slugOf(first))]];
      }),
    }),
  ),
);

function resolve(
  content: readonly GrantEntry[],
  roots: readonly number[],
  picks: readonly (readonly [SlotKey, string])[],
): GrantResolution {
  return resolveGrants(
    inputsOf({ entries: content, roots: roots.map((index) => picked(slugOf(index))), picks: picksOf(picks) }),
  );
}

/** Whether `slot` is on the chain behind any item. */
const through = (result: GrantResolution, slot: SlotKey): boolean =>
  result.items.some((item) => item.origin.hops.some((hop) => hop.kind === OriginHopKind.Choice && hop.slot === slot));

describe('resolveGrants choice properties', () => {
  test('acyclic content with picks resolves without errors, every slot open or answered', () => {
    assert(
      property(drawn, ({ content, roots, picks }) => {
        const result = resolve(content, roots, picks);
        expect(result.errors).toEqual([]);
        expect(result.open).toEqual([]);
        expect(result.answered.length).toBeLessThanOrEqual(picks.length);
      }),
    );
  });

  test('the result does not depend on the order the roots are given in', () => {
    const shuffled = drawn.chain((draw) =>
      shuffledSubarray([...draw.roots], { minLength: draw.roots.length }).map((order) => ({ draw, order })),
    );
    assert(
      property(shuffled, ({ draw, order }) => {
        expect(resolve(draw.content, order, draw.picks)).toEqual(resolve(draw.content, draw.roots, draw.picks));
      }),
    );
  });

  test('removing a pick drops everything granted through it and reopens its slot', () => {
    const withDrop = drawn
      .filter((draw) => draw.picks.length > 0)
      .chain((draw) => integer({ min: 0, max: draw.picks.length - 1 }).map((drop) => ({ draw, drop })));
    assert(
      property(withDrop, ({ draw, drop }) => {
        const before = resolve(draw.content, draw.roots, draw.picks);
        const slot = draw.picks[drop]?.[0];
        const kept = draw.picks.filter((_pick, index) => index !== drop);
        const after = resolve(draw.content, draw.roots, kept);
        if (slot === undefined || !before.answered.some((answered) => answered.key === slot)) {
          return;
        }
        expect(through(after, slot)).toBe(false);
        expect(after.open.map((open) => open.key)).toContain(slot);
      }),
    );
  });
});
