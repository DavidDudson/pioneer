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

describe('sensesInPlay (properties)', () => {
  test('one sense per id an ungated element names, with the best acuity and the longest range of its grants', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const live = elements.filter(({ gated }) => !gated);
        const expected = [...new Set(live.map(({ sense }) => sense))].toSorted().map((id) => {
          const grants = live.filter(({ sense }) => sense === id);
          const acuity = ACUITIES[Math.max(...grants.map(({ acuity: each }) => ACUITIES.indexOf(each ?? 'precise')))];
          const unlimited = grants.some(({ range }) => range === null);
          const range = unlimited ? undefined : Math.max(...grants.map(({ range: each }) => each ?? 0));
          return { sense: id, acuity, range, origins: grants.length };
        });

        const senses = sensesInPlay({ rules: rulesOf(elements), facts });

        expect(
          senses.map(({ sense, acuity, range, origins }) => ({ sense, acuity, range, origins: origins.length })),
        ).toEqual(expected);
      }),
    );
  });

  test('the order of the elements never changes the senses', () => {
    assert(
      property(array(placed, { maxLength: ELEMENTS_MAX }), (elements) => {
        const strip = (rules: RuleInPlay[]): object[] =>
          sensesInPlay({ rules, facts }).map(({ sense, acuity, range }) => ({ sense, acuity, range }));

        expect(strip(rulesOf(elements.toReversed()))).toEqual(strip(rulesOf(elements)));
      }),
    );
  });
});
