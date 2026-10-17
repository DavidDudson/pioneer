import {
  actionCosts,
  costAllowed,
  isConsumableCommand,
  isSpendCommand,
  SpendCommandField,
  SpendProblem,
  SpendTime,
  spendRefusal,
} from '@pioneer/character/domain';
import type {
  CountedMaxima,
  PlayCommand,
  PlayState,
  ResourceMaxima,
  SpendCommand,
  SpendLimits,
} from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

import { contentRefusal } from './spend-content';

/** The message each refused spend answers with. */
const SPEND_MESSAGES = {
  [SpendProblem.TooFewActions]: 'character.validation.spendTooFewActions',
  [SpendProblem.ReactionSpent]: 'character.validation.spendReactionSpent',
  [SpendProblem.OffTurn]: 'character.validation.spendOffTurn',
  [SpendProblem.CostNotAllowed]: 'character.validation.spendCostNotAllowed',
  [SpendProblem.NoUseLeft]: 'character.validation.spendNoUseLeft',
  [SpendProblem.NoSlotLeft]: 'character.validation.spendNoSlotLeft',
  [SpendProblem.NoFocusLeft]: 'character.validation.spendNoFocusLeft',
  [SpendProblem.AlreadySpent]: 'character.validation.spendAlreadySpent',
  [SpendProblem.PaymentConflict]: 'character.validation.spendPaymentConflict',
  [SpendProblem.AttackNotAllowed]: 'character.validation.spendAttackNotAllowed',
  [SpendProblem.PaymentNotAllowed]: 'character.validation.spendPaymentNotAllowed',
  [SpendProblem.NotSpent]: 'character.validation.spendNotSpent',
} as const satisfies Record<SpendProblem, string>;

/** What a spend is checked against: the uses the build gives and the content's costs. */
interface SpendContext {
  readonly counted: CountedMaxima;
  readonly points: ResourceMaxima;
  readonly registry: ContentRegistry;
}

/** Refuses with the message for `problem`. */
function refuse(problem: SpendProblem): never {
  throw new ValidationError([{ path: ['command'], message: message(SPEND_MESSAGES[problem]) }]);
}

/** The spend a play edit makes: the edit itself, or the activation of a consumable it uses. */
function spendOf(command: PlayCommand): SpendCommand | undefined {
  if (isConsumableCommand(command)) {
    return { field: SpendCommandField.SpendAction, ...command.spend };
  }
  return isSpendCommand(command) ? command : undefined;
}

/** The problem the content of a spent action has with the spend: its cost, the attack flag or the payment. */
function contentProblem(command: SpendCommand, registry: ContentRegistry): SpendProblem | undefined {
  if (command.field !== SpendCommandField.SpendAction) {
    return undefined;
  }
  const range = actionCosts(registry).get(command.action);
  if (range !== undefined && !costAllowed(command.cost, range)) {
    return SpendProblem.CostNotAllowed;
  }
  return contentRefusal(command, registry);
}

/**
 * Refuses a spend, or taking one back, that the turn, the frequency or the action's own content rules out, so the edit
 * is never partly applied. The content gives the cost, not the client, and says whether the attack flag and a spell's
 * slot or Focus Point are allowed; an action the content has no entry for, such as a Strike, is checked against the
 * turn alone.
 */
function checkSpend(play: PlayState, edit: PlayCommand, { counted, points, registry }: SpendContext): void {
  const command = spendOf(edit);
  if (command === undefined) {
    return;
  }
  const refused = contentProblem(command, registry);
  if (refused !== undefined) {
    refuse(refused);
  }
  const problem = spendRefusal(play, command, { counted, points });
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
