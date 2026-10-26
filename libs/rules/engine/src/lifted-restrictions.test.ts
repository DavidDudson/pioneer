import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, RollOption, Slug } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { liftedRestrictions } from './lifted-restrictions';
import type { LiftedRestriction } from './lifted-restrictions';
import { inPlay } from './testing';

const UNDERWATER = ContentId.parse('3b0e2f0e-86b6-5b1b-a0f2-0b1f6d3f6a11');

const lift = (restriction: string, extra: object = {}): object => ({ key: 'LiftRestriction', restriction, ...extra });

function liftedBy(
  placed: readonly (readonly [object, string])[],
  options: readonly string[] = [],
): readonly LiftedRestriction[] {
  const rules = placed.map(([element, on], rule) => inPlay(element, on, { rule }));
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return liftedRestrictions({ rules, facts });
}

describe('liftedRestrictions', () => {
  test('lifts the restriction a LiftRestriction element names, with its origin', () => {
    const { origin } = inPlay(lift('speech'), 'aquatic-ancestry');

    expect(liftedBy([[lift('speech'), 'aquatic-ancestry']])).toEqual([
      { restriction: Slug.parse('speech'), origins: [origin] },
    ]);
  });

  test('scopes the lift to the environment it names', () => {
    const [only] = liftedBy([[lift('speech', { environment: UNDERWATER }), 'aquatic-ancestry']]);

    expect(only?.environment).toBe(UNDERWATER);
  });

  test('joins lifts of one restriction from several sources into one with each origin', () => {
    const [only, ...rest] = liftedBy([
      [lift('fire-effects'), 'air-bubble'],
      [lift('fire-effects'), 'water-breathing'],
    ]);

    expect(rest).toEqual([]);
    expect(only?.origins).toEqual([
      inPlay(lift('fire-effects'), 'air-bubble').origin,
      inPlay(lift('fire-effects'), 'water-breathing').origin,
    ]);
  });

  test('keeps a lift in one environment apart from the same restriction in any', () => {
    const lifts = liftedBy([
      [lift('speech'), 'a'],
      [lift('speech', { environment: UNDERWATER }), 'b'],
    ]);

    expect(lifts).toHaveLength(2);
  });

  test('ignores a lift whose predicate does not hold, and holds one whose predicate does', () => {
    const gated = lift('speech', { predicate: ['self:trait:aquatic'] });

    expect(liftedBy([[gated, 'a']])).toEqual([]);
    expect(liftedBy([[gated, 'a']], ['self:trait:aquatic'])).toHaveLength(1);
  });
});
