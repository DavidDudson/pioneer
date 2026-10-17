import { SpendKind, TurnPhase } from '@pioneer/character/domain';
import type { ActionCostRange, SpendCost, TurnState } from '@pioneer/character/domain';
import { ActionCost } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** Message keys for why the turn can't pay for an action, spelled out so the key check sees them. */
export const TurnReasonMessage = {
  /** "Needs 2 actions, 1 left": the turn has fewer actions than the action takes. */
  TooFewActions: 'rules.actions.turn.tooFewActions',
  /** Off turn only reactions and free actions with a trigger can be used. */
  OffTurn: 'rules.actions.turn.offTurn',
  /** The reaction is already spent. */
  ReactionSpent: 'rules.actions.turn.reactionSpent',
} as const;

/** Whether `turn` is spent on someone else's turn, where a free action needs a trigger. */
export function offTurnWithoutTrigger(turn: TurnState | undefined, range: ActionCostRange | undefined): boolean {
  return turn?.phase === TurnPhase.OffTurn && range?.cost === ActionCost.Free && range.triggered !== true;
}

/**
 * Why `turn` can't pay for something that costs `fewest`, worded as a message: too few actions (how many it takes and
 * how many are left), the reaction spent, or off turn. Undefined when it can be paid or no turn is tracked.
 */
export function turnReason(turn: TurnState | undefined, fewest: SpendCost | undefined): MessageDescriptor | undefined {
  if (turn === undefined || turn.phase === TurnPhase.OutOfEncounter || fewest === undefined) {
    return undefined;
  }
  if (fewest.kind === SpendKind.Reaction) {
    return message(TurnReasonMessage.ReactionSpent);
  }
  if (turn.phase === TurnPhase.OffTurn) {
    return message(TurnReasonMessage.OffTurn);
  }
  return fewest.kind === SpendKind.Actions
    ? message(TurnReasonMessage.TooFewActions, { count: fewest.count, left: turn.actions })
    : undefined;
}
