import { describe, expect, test } from 'bun:test';

import { ActionCost } from '@pioneer/rules/sdk';

import { costAllowed, SpendCount, SpendKind } from './spend-log';
import type { SpendCost } from './spend-log';
import { actions } from './spend-log-testing';

const REACTION: SpendCost = { kind: SpendKind.Reaction };
const FREE: SpendCost = { kind: SpendKind.Free };

describe('costAllowed', () => {
  const upToTwo = SpendCount.parse(2);

  test('a fixed cost allows only its own count', () => {
    expect(costAllowed(actions(2), { cost: ActionCost.Two })).toBe(true);
    expect(costAllowed(actions(1), { cost: ActionCost.Two })).toBe(false);
  });

  test('a variable cost allows its start up to its end', () => {
    const range = { cost: ActionCost.One, upTo: upToTwo };
    expect(costAllowed(actions(1), range)).toBe(true);
    expect(costAllowed(actions(2), range)).toBe(true);
    expect(costAllowed(actions(3), range)).toBe(false);
  });

  test('a reaction or free action allows only itself', () => {
    expect(costAllowed(REACTION, { cost: ActionCost.Reaction })).toBe(true);
    expect(costAllowed(FREE, { cost: ActionCost.Reaction })).toBe(false);
    expect(costAllowed(actions(1), { cost: ActionCost.Free })).toBe(false);
  });
});
