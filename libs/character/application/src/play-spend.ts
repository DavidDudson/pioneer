import {
  actionCosts,
  costAllowed,
  isSpendCommand,
  SpendCommandField,
  SpendProblem,
  SpendTime,
  spendRefusal,
} from '@pioneer/character/domain';
import type { CountedMaxima, PlayCommand, PlayState, SpendLimits } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

/** The message each refused spend answers with. */
const SPEND_MESSAGES = {
  [SpendProblem.TooFewActions]: 'character.validation.spendTooFewActions',
  [SpendProblem.ReactionSpent]: 'character.validation.spendReactionSpent',
  [SpendProblem.OffTurn]: 'character.validation.spendOffTurn',
  [SpendProblem.CostNotAllowed]: 'character.validation.spendCostNotAllowed',
  [SpendProblem.NoUseLeft]: 'character.validation.spendNoUseLeft',
  [SpendProblem.AlreadySpent]: 'character.validation.spendAlreadySpent',
  [SpendProblem.NotSpent]: 'character.validation.spendNotSpent',
} as const satisfies Record<SpendProblem, string>;

/** What a spend is checked against: the uses the build gives and the content's costs. */
export interface SpendContext {
  readonly counted: CountedMaxima;
  readonly registry: ContentRegistry;
}

/** Refuses with the message for `problem`. */
function refuse(problem: SpendProblem): never {
  throw new ValidationError([{ path: ['command'], message: message(SPEND_MESSAGES[problem]) }]);
}

/**
 * Refuses a spend, or taking one back, that the turn, the frequency or the action's own content rules out, so the edit
 * is never partly applied. The content gives the cost, not the client; an action the content has no cost for, such as
 * a Strike or a spell, is checked against the turn alone.
 */
export function checkSpend(play: PlayState, command: PlayCommand, { counted, registry }: SpendContext): void {
  if (!isSpendCommand(command)) {
    return;
  }
  if (command.field === SpendCommandField.SpendAction) {
    const range = actionCosts(registry).get(command.action);
    if (range !== undefined && !costAllowed(command.cost, range)) {
      refuse(SpendProblem.CostNotAllowed);
    }
  }
  const problem = spendRefusal(play, command, { counted });
  if (problem !== undefined) {
    refuse(problem);
  }
}

/** What a spend is checked against, and the clock it is stamped by. */
export interface SpendStamp extends SpendContext {
  readonly play: PlayState;
  readonly now: Temporal.Instant;
}

/** The limits a play edit reads for spending: the time to stamp with, once a spend passes `checkSpend`. */
export function spendLimits(command: PlayCommand, { play, now, ...context }: SpendStamp): SpendLimits {
  checkSpend(play, command, context);
  return { now: SpendTime.parse(now.toString()) };
}
