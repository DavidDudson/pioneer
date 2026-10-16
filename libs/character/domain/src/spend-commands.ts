import { heldCount } from './counted-resources';
import type { UseCountKey } from './counted-resources';
import { applyResourceCommand, ResourceCommandField } from './resource-commands';
import type { ResourceLimits, ResourcePlay } from './resource-commands';
import { ResourceCount } from './resource-count';
import { SpendCommandField, SpendKind, SpendProblem, spendLogged, spendUndone } from './spend-log';
import type { SpendCommand, SpendCount, SpendEntry, SpendLog, SpendRequest, SpendTime } from './spend-log';
import { ActionCount, QuickenedAction, TURN_ACTIONS, TurnPhase } from './turn-state';
import type { TurnState } from './turn-state';

const NONE = ResourceCount.parse(0);
const NO_QUICKENED = QuickenedAction.parse(0);
const ONE_QUICKENED = QuickenedAction.parse(1);

/** What a spend reads besides the play state: the time to stamp it with. */
export interface SpendLimits {
  readonly now: SpendTime;
}

/** The part of a play state a spend reads and writes: the turn it takes from, the log, and the uses a frequency touches. */
export type SpendPlay = ResourcePlay & { readonly turn: TurnState; readonly spendLog: SpendLog };

/** Whether `command` spends from the turn or takes a spend back. */
export function isSpendCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, SpendCommand> {
  return Object.values<unknown>(SpendCommandField).includes(command.field);
}

/** What a spend of some actions takes from the turn: ordinary actions first, then the quickened one. */
interface Draw {
  readonly ordinary: ActionCount;
  readonly quickened: QuickenedAction;
}

/**
 * What `count` actions take from `turn`, or undefined when it has too few. The quickened action is used only when it
 * carries no restriction, as the content does not say what an action is.
 */
function drawn(turn: TurnState, count: SpendCount): Draw | undefined {
  const ordinary = ActionCount.parse(Math.min(count, turn.actions));
  const short = count - ordinary;
  if (short === 0) {
    return { ordinary, quickened: NO_QUICKENED };
  }
  const usable = turn.quickened === ONE_QUICKENED && turn.quickenedFor === undefined;
  return usable && short === ONE_QUICKENED ? { ordinary, quickened: ONE_QUICKENED } : undefined;
}

/** Whether the turn is tracked: out of an encounter nothing is counted, so a spend only logs. */
function tracked({ phase }: TurnState): boolean {
  return phase !== TurnPhase.OutOfEncounter;
}

/** Why `request` can't be spent from `play`'s turn, or undefined when it can. */
function requestProblem({ turn, spendLog }: SpendPlay, request: SpendRequest): SpendProblem | undefined {
  const { cost } = request;
  if (spendLog.some(({ id }) => id === request.id)) {
    return SpendProblem.AlreadySpent;
  }
  if (cost.kind === SpendKind.Reaction) {
    return tracked(turn) && turn.reactionUsed ? SpendProblem.ReactionSpent : undefined;
  }
  if (cost.kind !== SpendKind.Actions || !tracked(turn)) {
    return undefined;
  }
  if (turn.phase === TurnPhase.OffTurn) {
    return SpendProblem.OffTurn;
  }
  return drawn(turn, cost.count) === undefined ? SpendProblem.TooFewActions : undefined;
}

/** Why the spend `entry` can't be taken back: its actions came out of a turn that is over. */
function entryProblem({ turn }: SpendPlay, { cost }: SpendEntry): SpendProblem | undefined {
  return cost.kind === SpendKind.Actions && turn.phase === TurnPhase.OffTurn ? SpendProblem.OffTurn : undefined;
}

/** Why `command` is refused by the turn and the uses `play` holds, or undefined when it is allowed. */
export function spendRefusal(
  play: SpendPlay,
  command: SpendCommand,
  { counted }: Pick<ResourceLimits, 'counted'>,
): SpendProblem | undefined {
  if (command.field === SpendCommandField.UndoSpend) {
    const entry = play.spendLog.find(({ id }) => id === command.id);
    return entry === undefined ? SpendProblem.NotSpent : entryProblem(play, entry);
  }
  const { use } = command;
  if (use !== undefined && heldCount({ spent: play.resources.uses, maxima: counted.uses, key: use }) === NONE) {
    return SpendProblem.NoUseLeft;
  }
  return requestProblem(play, command);
}

/** A frequency use to spend or refund, when a spend recorded one. */
interface UseChange {
  readonly use?: UseCountKey | undefined;
  readonly field: typeof ResourceCommandField.SpendUse | typeof ResourceCommandField.RefundUse;
}

/** `play` after the frequency use of `change` is spent or refunded, when there is one. */
function withUse(play: SpendPlay, { use, field }: UseChange, limits: ResourceLimits): SpendPlay {
  return use === undefined ? play : { ...play, ...applyResourceCommand(play, { field, use }, limits) };
}

/** The turn after a spend took its cost, and how much of that was the quickened action. */
interface Taken {
  readonly turn: TurnState;
  readonly quickened: QuickenedAction;
}

/** `turn` after `request` took its cost. */
function spentFrom(turn: TurnState, { cost }: SpendRequest): Taken {
  const untouched: Taken = { turn, quickened: NO_QUICKENED };
  if (!tracked(turn)) {
    return untouched;
  }
  if (cost.kind === SpendKind.Reaction) {
    return { turn: { ...turn, reactionUsed: true }, quickened: NO_QUICKENED };
  }
  const draw = cost.kind === SpendKind.Actions ? drawn(turn, cost.count) : undefined;
  if (draw === undefined) {
    return untouched;
  }
  const actions = ActionCount.parse(turn.actions - draw.ordinary);
  const quickened = QuickenedAction.parse(turn.quickened - draw.quickened);
  return { turn: { ...turn, actions, quickened }, quickened: draw.quickened };
}

/** `turn` after the spend `entry` is taken back: the actions, quickened action and reaction it took are back. */
function refundedTo(turn: TurnState, { cost, quickened }: SpendEntry): TurnState {
  if (!tracked(turn) || cost.kind === SpendKind.Free) {
    return turn;
  }
  if (cost.kind === SpendKind.Reaction) {
    return { ...turn, reactionUsed: false };
  }
  const actions = ActionCount.parse(Math.min(turn.actions + cost.count - quickened, TURN_ACTIONS));
  return { ...turn, actions, quickened: QuickenedAction.parse(Math.min(turn.quickened + quickened, ONE_QUICKENED)) };
}

/** `play` after the spend `entry` is taken back: the turn gets what it took, and the frequency its use. */
function undone(play: SpendPlay, entry: SpendEntry, limits: ResourceLimits): SpendPlay {
  const refunded = withUse(play, { use: entry.use, field: ResourceCommandField.RefundUse }, limits);
  return { ...refunded, turn: refundedTo(play.turn, entry), spendLog: spendUndone(play.spendLog, entry.id) };
}

/** `play` after `request` is taken from the turn and logged, with its frequency use spent. */
function spent(play: SpendPlay, request: SpendRequest, limits: ResourceLimits & SpendLimits): SpendPlay {
  const taken = spentFrom(play.turn, request);
  const used = withUse(play, { use: request.use, field: ResourceCommandField.SpendUse }, limits);
  const entry: SpendEntry = { ...request, at: limits.now, quickened: taken.quickened };
  return { ...used, turn: taken.turn, spendLog: spendLogged(play.spendLog, entry) };
}

/**
 * `play` after `command`: the spend taken from the turn and logged with its frequency use spent, or the spend removed
 * with what it took, and the use, given back. A command the turn refuses leaves `play` as it was, so the edit is never
 * partly applied. Out of an encounter nothing is counted, so a spend only logs.
 */
export function applySpendCommand(
  play: SpendPlay,
  command: SpendCommand,
  limits: ResourceLimits & SpendLimits,
): SpendPlay {
  if (spendRefusal(play, command, limits) !== undefined) {
    return play;
  }
  if (command.field === SpendCommandField.SpendAction) {
    const { field: _field, ...request } = command;
    return spent(play, request, limits);
  }
  const entry = play.spendLog.find(({ id }) => id === command.id);
  return entry === undefined ? play : undone(play, entry, limits);
}
