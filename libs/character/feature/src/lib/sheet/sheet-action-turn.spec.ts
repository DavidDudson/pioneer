import { SpendCount, SpendKind, TurnPhase, TurnStateSchema } from '@pioneer/character/domain';
import type { ActionCostRange, SpendCost, TurnState } from '@pioneer/character/domain';
import { ActionCost } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { offTurnWithoutTrigger, TurnReasonMessage, turnReason } from './sheet-action-turn';

const TWO_ACTIONS: SpendCost = { kind: SpendKind.Actions, count: SpendCount.parse(2) };
const REACTION: SpendCost = { kind: SpendKind.Reaction };
const FREE: SpendCost = { kind: SpendKind.Free };

function turn(phase: TurnPhase, actions: number, extras: Partial<TurnState> = {}): TurnState {
  return TurnStateSchema.parse({ phase, actions, ...extras });
}

function free(triggered: boolean): ActionCostRange {
  return { cost: ActionCost.Free, triggered };
}

describe(turnReason, () => {
  it('says how many actions it takes and how many are left', () => {
    expect(turnReason(turn(TurnPhase.Turn, 1), TWO_ACTIONS)).toStrictEqual({
      key: TurnReasonMessage.TooFewActions,
      params: { count: 2, left: 1 },
    });
  });

  it('says it is not the turn for an action off turn', () => {
    expect(turnReason(turn(TurnPhase.OffTurn, 0), TWO_ACTIONS)).toStrictEqual({ key: TurnReasonMessage.OffTurn });
  });

  it('says it is not the turn for a free action off turn', () => {
    expect(turnReason(turn(TurnPhase.OffTurn, 0), FREE)).toStrictEqual({ key: TurnReasonMessage.OffTurn });
  });

  it('says the reaction is spent', () => {
    expect(turnReason(turn(TurnPhase.OffTurn, 0, { reactionUsed: true }), REACTION)).toStrictEqual({
      key: TurnReasonMessage.ReactionSpent,
    });
  });

  it('says nothing out of an encounter, where nothing is counted', () => {
    expect(turnReason(turn(TurnPhase.OutOfEncounter, 0), TWO_ACTIONS)).toBeUndefined();
  });

  it('says nothing without a turn or a cost', () => {
    expect(turnReason(undefined, TWO_ACTIONS)).toBeUndefined();
    expect(turnReason(turn(TurnPhase.Turn, 3), undefined)).toBeUndefined();
  });
});

describe(offTurnWithoutTrigger, () => {
  it('holds back a free action with no trigger off turn', () => {
    expect(offTurnWithoutTrigger(turn(TurnPhase.OffTurn, 0), free(false))).toBe(true);
  });

  it('lets a free action with a trigger through off turn', () => {
    expect(offTurnWithoutTrigger(turn(TurnPhase.OffTurn, 0), free(true))).toBe(false);
  });

  it('holds nothing back on the turn or out of an encounter', () => {
    expect(offTurnWithoutTrigger(turn(TurnPhase.Turn, 3), free(false))).toBe(false);
    expect(offTurnWithoutTrigger(turn(TurnPhase.OutOfEncounter, 0), free(false))).toBe(false);
  });

  it('holds back no action that is not free', () => {
    expect(offTurnWithoutTrigger(turn(TurnPhase.OffTurn, 0), { cost: ActionCost.Reaction })).toBe(false);
  });
});
