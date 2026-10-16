import { SpendKind } from '@pioneer/character/domain';
import { ActionCost } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { spendCostOf } from './sheet-actions';

describe(spendCostOf, () => {
  it("spends the glyph's own count for a fixed cost", () => {
    expect(spendCostOf(ActionCost.Two, undefined)).toMatchObject({ kind: SpendKind.Actions, count: 2 });
  });

  it('spends the count chosen for a variable cost', () => {
    expect(spendCostOf(ActionCost.One, 2)).toMatchObject({ kind: SpendKind.Actions, count: 2 });
  });

  it('spends the reaction, and nothing for a free action', () => {
    expect(spendCostOf(ActionCost.Reaction, undefined)).toStrictEqual({ kind: SpendKind.Reaction });
    expect(spendCostOf(ActionCost.Free, undefined)).toStrictEqual({ kind: SpendKind.Free });
  });

  it('has nothing to spend for an action with no cost', () => {
    expect(spendCostOf(undefined, undefined)).toBeUndefined();
  });
});
