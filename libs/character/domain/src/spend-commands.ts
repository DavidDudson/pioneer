import type { ActiveSpell } from './active-spells';
import { heldCount } from './counted-resources';
import type { SlotCountKey, UseCountKey } from './counted-resources';
import { applyResourceCommand, ResourceCommandField } from './resource-commands';
import type { ResourceLimits, ResourcePlay } from './resource-commands';
import { ResourceCount } from './resource-count';
import { heldIn, Resource } from './resources';
import { SpendCommandField, SpendKind, SpendProblem, spendLogged, spendUndone } from './spend-log';
import type { SpendCommand, SpendCost, SpendCount, SpendEntry, SpendLog, SpendRequest, SpendTime } from './spend-log';
import { spellRefusal, spellSpent, spellUndoRefusal, spellUndone } from './spend-spells';
import { StaffCommandField } from './staff-commands';
import type { StaffCast, StaffCommand } from './staff-commands';
import { ActionCount, attacksMoved, QuickenedAction, TURN_ACTIONS, TurnPhase } from './turn-state';
import type { TurnState } from './turn-state';

const NONE = ResourceCount.parse(0);
const ONE_POINT = ResourceCount.parse(1);
const NO_QUICKENED = QuickenedAction.parse(0);
const ONE_QUICKENED = QuickenedAction.parse(1);

/** What a spend reads besides the play state: the time to stamp it with. */
export interface SpendLimits {
  readonly now: SpendTime;
}

/** The part of a play state a spend reads and writes: the turn it takes from, the log, and the uses a frequency touches. */
export type SpendPlay = ResourcePlay & {
  readonly turn: TurnState;
  readonly spendLog: SpendLog;
  readonly activeSpells: readonly ActiveSpell[];
};

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

/** Why `turn` can't pay `cost`, or undefined when it can. */
function costProblem(turn: TurnState, cost: SpendCost): SpendProblem | undefined {
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

/** Whether `turn` can pay `cost` now: what the sheet offers, so an action the turn would refuse is not listed. */
export function turnAllows(turn: TurnState, cost: SpendCost): boolean {
  return costProblem(turn, cost) === undefined;
}

/** Why `request` can't be spent from `play`'s turn, or undefined when it can. */
function requestProblem(play: SpendPlay, request: SpendRequest): SpendProblem | undefined {
  const { turn, spendLog } = play;
  if (spendLog.some(({ id }) => id === request.id)) {
    return SpendProblem.AlreadySpent;
  }
  if (paysTwice(request)) {
    return SpendProblem.PaymentConflict;
  }
  return spellRefusal(play, request) ?? costProblem(turn, request.cost);
}

/** Why the spend `entry` can't be taken back: its actions came out of a turn that is over, or its dismissed spell has no room to return. */
function entryProblem(play: SpendPlay, entry: SpendEntry): SpendProblem | undefined {
  if (entry.cost.kind === SpendKind.Actions && play.turn.phase === TurnPhase.OffTurn) {
    return SpendProblem.OffTurn;
  }
  return spellUndoRefusal(play, entry);
}

/** Whether a spend that records a staff cast also expends a slot or a Focus Point, which the staff already pays for. */
function paysTwice({ staff, slot, focus }: SpendRequest): boolean {
  return staff !== undefined && (slot !== undefined || focus === true);
}

/** Why `command` is refused by the turn and the uses `play` holds, or undefined when it is allowed. */
export function spendRefusal(
  play: SpendPlay,
  command: SpendCommand,
  { counted, points }: Pick<ResourceLimits, 'counted' | 'points'>,
): SpendProblem | undefined {
  if (command.field === SpendCommandField.UndoSpend) {
    const entry = play.spendLog.find(({ id }) => id === command.id);
    return entry === undefined ? SpendProblem.NotSpent : entryProblem(play, entry);
  }
  const { use, slot, focus } = command;
  if (use !== undefined && heldCount({ spent: play.resources.uses, maxima: counted.uses, key: use }) === NONE) {
    return SpendProblem.NoUseLeft;
  }
  if (slot !== undefined && heldCount({ spent: play.resources.slots, maxima: counted.slots, key: slot }) === NONE) {
    return SpendProblem.NoSlotLeft;
  }
  if (focus === true && heldIn({ spent: play.resources, maxima: points }, Resource.FocusPoints) === NONE) {
    return SpendProblem.NoFocusLeft;
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

/** A spell slot to expend or give back, when a spend recorded one. */
interface SlotChange {
  readonly slot?: SlotCountKey | undefined;
  readonly field: typeof ResourceCommandField.SpendSlot | typeof ResourceCommandField.RefundSlot;
}

/** `play` after the slot of `change` is expended or given back, when there is one. */
function withSlot(play: SpendPlay, { slot, field }: SlotChange, limits: ResourceLimits): SpendPlay {
  return slot === undefined ? play : { ...play, ...applyResourceCommand(play, { field, slot }, limits) };
}

/** A Focus Point to spend or regain, when a spend recorded one. */
interface FocusChange {
  readonly focus?: true | undefined;
  readonly field: typeof ResourceCommandField.SpendResource | typeof ResourceCommandField.RegainResource;
}

/** `play` after the Focus Point of `change` is spent or regained, when there is one. */
function withFocus(play: SpendPlay, { focus, field }: FocusChange, limits: ResourceLimits): SpendPlay {
  const command = { field, resource: Resource.FocusPoints, amount: ONE_POINT };
  return focus === true ? { ...play, ...applyResourceCommand(play, command, limits) } : play;
}

/** A staff cast to make or take back, when a spend recorded one. */
interface StaffChange {
  readonly staff?: StaffCast | undefined;
  readonly field: typeof StaffCommandField.CastStaff | typeof StaffCommandField.UncastStaff;
}

/** `play` after the staff cast of `change` is paid for or given back, when there is one. */
function withStaff(play: SpendPlay, { staff, field }: StaffChange, limits: ResourceLimits): SpendPlay {
  return staff === undefined ? play : { ...play, ...applyResourceCommand(play, { field, ...staff }, limits) };
}

/**
 * The staff cast `command` makes or takes back, for the edits that need the staff's content to check it: a spend that
 * records a cast pays for it, and taking back a spend that recorded one gives it back.
 */
export function spentStaffOf(play: Pick<SpendPlay, 'spendLog'>, command: SpendCommand): StaffCommand | undefined {
  if (command.field === SpendCommandField.SpendAction) {
    return command.staff === undefined ? undefined : { field: StaffCommandField.CastStaff, ...command.staff };
  }
  const { staff } = play.spendLog.find(({ id }) => id === command.id) ?? {};
  return staff === undefined ? undefined : { field: StaffCommandField.UncastStaff, ...staff };
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

/** `turn` with the attack of a spend counted, or taken back, when the spend was one and the turn is running. */
function withAttack(turn: TurnState, { attack }: Pick<SpendRequest, 'attack'>, by: 1 | -1): TurnState {
  return attack === true && turn.phase === TurnPhase.Turn ? attacksMoved(turn, by) : turn;
}

/** `play` after the spend `entry` is taken back: the turn gets what it took, and the frequency its use. */
function undone(play: SpendPlay, entry: SpendEntry, limits: ResourceLimits): SpendPlay {
  const given = withStaff(play, { staff: entry.staff, field: StaffCommandField.UncastStaff }, limits);
  const slotted = withSlot(given, { slot: entry.slot, field: ResourceCommandField.RefundSlot }, limits);
  const focused = withFocus(slotted, { focus: entry.focus, field: ResourceCommandField.RegainResource }, limits);
  const refunded = withUse(focused, { use: entry.use, field: ResourceCommandField.RefundUse }, limits);
  return {
    ...refunded,
    turn: withAttack(refundedTo(play.turn, entry), entry, -1),
    spendLog: spendUndone(play.spendLog, entry.id),
    activeSpells: spellUndone(play, entry),
  };
}

/** `play` after `request` is taken from the turn and logged, with its frequency use spent. */
function spent(play: SpendPlay, request: SpendRequest, limits: ResourceLimits & SpendLimits): SpendPlay {
  const taken = spentFrom(play.turn, request);
  const paid = withStaff(play, { staff: request.staff, field: StaffCommandField.CastStaff }, limits);
  const slotted = withSlot(paid, { slot: request.slot, field: ResourceCommandField.SpendSlot }, limits);
  const focused = withFocus(slotted, { focus: request.focus, field: ResourceCommandField.SpendResource }, limits);
  const used = withUse(focused, { use: request.use, field: ResourceCommandField.SpendUse }, limits);
  const { activeSpells, dismissed } = spellSpent(play, request);
  const entry: SpendEntry = {
    ...request,
    at: limits.now,
    quickened: taken.quickened,
    ...(dismissed === undefined ? {} : { dismissed }),
  };
  return {
    ...used,
    turn: withAttack(taken.turn, request, 1),
    spendLog: spendLogged(play.spendLog, entry),
    activeSpells,
  };
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
