import { SpendKind, TurnPhase, TurnStateSchema } from '@pioneer/character/domain';
import type { TurnState } from '@pioneer/character/domain';
import { ActionCost } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { affordability, spendCostOf } from './sheet-actions';

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

function turn(phase: TurnPhase, actions: number, extras: Partial<TurnState> = {}): TurnState {
  return TurnStateSchema.parse({ phase, actions, ...extras });
}

describe(affordability, () => {
  it('says nothing without a turn or a cost', () => {
    expect(affordability(undefined, ActionCost.One, undefined)).toStrictEqual({});
    expect(affordability(turn(TurnPhase.Turn, 3), undefined, undefined)).toStrictEqual({});
  });

  it('affords a cost the actions left pay for, and not one they do not', () => {
    expect(affordability(turn(TurnPhase.Turn, 2), ActionCost.Two, undefined).affordable).toBe(true);
    expect(affordability(turn(TurnPhase.Turn, 1), ActionCost.Two, undefined).affordable).toBe(false);
  });

  it('caps a variable cost at the most the turn can pay', () => {
    expect(affordability(turn(TurnPhase.Turn, 2), ActionCost.One, 3)).toStrictEqual({
      affordable: true,
      affordableUpTo: 2,
    });
    expect(affordability(turn(TurnPhase.Turn, 0), ActionCost.One, 3).affordable).toBe(false);
  });

  it('offers only the reaction and free actions off turn', () => {
    const off = turn(TurnPhase.OffTurn, 0);
    expect(affordability(off, ActionCost.One, undefined).affordable).toBe(false);
    expect(affordability(off, ActionCost.Reaction, undefined).affordable).toBe(true);
    expect(affordability(off, ActionCost.Free, undefined).affordable).toBe(true);
  });

  it('refuses the reaction once it is spent', () => {
    const spent = turn(TurnPhase.OffTurn, 0, { reactionUsed: true });
    expect(affordability(spent, ActionCost.Reaction, undefined).affordable).toBe(false);
  });
});
