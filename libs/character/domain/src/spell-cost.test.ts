import { describe, expect, test } from 'bun:test';

import { ActionCost, CastActions } from '@pioneer/rules/sdk';

import { spellCost } from './action-costs';
import { SpendCount } from './spend-log';

describe('what casting a spell costs', () => {
  test('is its one cost for a spell cast for a fixed number of actions', () => {
    expect(spellCost({ cast: [CastActions.Two] })).toStrictEqual({ cost: ActionCost.Two, upTo: undefined });
  });

  test('runs from the fewest to the most actions for a spell cast for one, two or three', () => {
    const cost = spellCost({ cast: [CastActions.Three, CastActions.One, CastActions.Two] });
    expect(cost).toStrictEqual({ cost: ActionCost.One, upTo: SpendCount.parse(3) });
  });

  test('is the reaction or the free action for a spell cast as one', () => {
    expect(spellCost({ cast: [CastActions.Reaction] })).toStrictEqual({ cost: ActionCost.Reaction });
    expect(spellCost({ cast: [CastActions.Free] })).toStrictEqual({ cost: ActionCost.Free });
  });

  test('is nothing for a spell cast over minutes or longer', () => {
    expect(spellCost({ cast: [CastActions.Time] })).toBeUndefined();
    expect(spellCost({ cast: [] })).toBeUndefined();
  });
});
