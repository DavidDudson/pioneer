import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, integer, option, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { RuleInPlay } from './rule-in-play';
import { sensesInPlay } from './senses-in-play';
import { inPlay } from './testing';

const SENSES = [
  ContentId.parse('279973df-e7b9-5fa1-9bb6-1cfdc54b82b6'),
  ContentId.parse('367b9fa7-8944-5208-9949-9457984b7c59'),
  ContentId.parse('67979b6a-4b24-5be5-b7ea-94783c497bcb'),
] as const;
const ACUITIES = ['vague', 'imprecise', 'precise'] as const;
const RANGE_MAX = 120;
const ELEMENTS_MAX = 12;
/** Holds from 5th level, so fails for the 1st-level character these properties use. */
const AT_FIFTH = [{ gte: ['self:level', 5] }];
const facts = new PredicateFacts([RollOption.parse('self:level:1')], CORE_NAMESPACES);

/** A `Sense` element; `null` acuity or range leaves the field out. */
interface Placed {
  readonly sense: ContentId;
  readonly acuity: (typeof ACUITIES)[number] | null;
  readonly range: number | null;
  /** Behind a predicate that fails at 1st level. */
  readonly gated: boolean;
}

const placed: Arbitrary<Placed> = record({
  sense: constantFrom(...SENSES),
  acuity: option(constantFrom(...ACUITIES)),
  range: option(integer({ min: 1, max: RANGE_MAX })),
  gated: boolean(),
});

function rulesOf(elements: readonly Placed[]): RuleInPlay[] {
  return elements.map(({ sense, acuity, range, gated }, rule) => {
    const element = {
      key: 'Sense',
      sense,
      ...(acuity === null ? {} : { acuity }),
      ...(range === null ? {} : { range }),
      ...(gated ? { predicate: AT_FIFTH } : {}),
    };
    return inPlay(element, 'feature', { rule });
  });
}

/** A grant as the engine reads it: Foundry's defaults applied, and no range as unlimited. */
interface Reading {
  readonly sense: ContentId;
  readonly acuity: number;
  readonly reach: number;
}

function readingOf({ sense, acuity, range }: Placed): Reading {
  return { sense, acuity: ACUITIES.indexOf(acuity ?? 'precise'), reach: range ?? Number.POSITIVE_INFINITY };
}

function beats(left: Reading, right: Reading): boolean {
  const covers = left.acuity >= right.acuity && left.reach >= right.reach;
  return covers && (left.acuity > right.acuity || left.reach > right.reach);
}

/** Each sense as `id acuity reach`, one line per distinct reading. */
function linesOf(readings: readonly Reading[]): string[] {
  return [...new Set(readings.map(({ sense, acuity, reach }) => `${sense} ${acuity} ${reach}`))].toSorted();
}

function sensesOf(elements: readonly Placed[]): string[] {
  const senses = sensesInPlay({ rules: rulesOf(elements), facts });
  return linesOf(
    senses.map(({ sense, acuity, range }) => ({
      sense,
      acuity: ACUITIES.indexOf(acuity),
      reach: range ?? Number.POSITIVE_INFINITY,
    })),
  );
}

describe('sensesInPlay (properties)', () => {
  test('the senses are the readings of ungated grants that no other grant of their sense beats', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const live = elements.filter(({ gated }) => !gated).map((each) => readingOf(each));
        const kept = live.filter((each) => !live.some((other) => other.sense === each.sense && beats(other, each)));

        expect(sensesOf(elements)).toEqual(linesOf(kept));
      }),
    );
  });

  test('the order of the elements never changes the senses', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const reversed = elements.toReversed();

        expect(sensesOf(reversed)).toEqual(sensesOf(elements));
      }),
    );
  });
});
