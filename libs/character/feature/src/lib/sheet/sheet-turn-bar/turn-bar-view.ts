import { TURN_ACTIONS, TurnEventKind, TurnPhase } from '@pioneer/character/domain';
import type { TurnEvent, TurnState } from '@pioneer/character/domain';
import { BadgeTone } from '@pioneer/frontier';
import { rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import { DiceMessage, RollMode } from '@pioneer/rules/dice';
import type { FortunedRoll, RollResult } from '@pioneer/rules/dice';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

/** Whether an action pip is still there to spend or is gone. */
export const PipState = { Left: 'left', Spent: 'spent' } as const;
export type PipState = ValueOf<typeof PipState>;

/** One action pip on the turn bar. */
export interface ActionPip {
  readonly state: PipState;
  /** Whether this is the quickened action, which the bar shows apart. */
  readonly quickened: boolean;
  /** What the quickened action's source limits it to, when it does. */
  readonly restriction: string | undefined;
}

/** The turn as the bar shows it. */
export interface TurnBarView {
  readonly phase: TurnPhase;
  readonly pips: readonly ActionPip[];
  readonly reactionUsed: boolean;
  /** The attacks made this turn; undefined outside a running turn, which counts none. */
  readonly attacks: number | undefined;
  readonly canEnter: boolean;
  readonly canStart: boolean;
  readonly canEnd: boolean;
  readonly canLeave: boolean;
}

const PHASE_KEYS = {
  [TurnPhase.Turn]: 'character.sheet.turn.phaseTurn',
  [TurnPhase.OffTurn]: 'character.sheet.turn.phaseOffTurn',
  [TurnPhase.OutOfEncounter]: 'character.sheet.turn.phaseOutOfEncounter',
} as const satisfies Record<TurnPhase, string>;

/** The message key that words a phase. */
export function phaseKey(phase: TurnPhase): string {
  return PHASE_KEYS[phase];
}

/** The pips of a turn: the ordinary actions, spent or left, then the quickened one. Only a running turn has any. */
function pipsOf({ phase, actions, quickened, quickenedFor }: TurnState): readonly ActionPip[] {
  if (phase !== TurnPhase.Turn) {
    return [];
  }
  const ordinary = Array.from({ length: TURN_ACTIONS }, (_slot, index): ActionPip => ({
    state: index < actions ? PipState.Left : PipState.Spent,
    quickened: false,
    restriction: undefined,
  }));
  const extra: ActionPip[] =
    quickened > 0 ? [{ state: PipState.Left, quickened: true, restriction: quickenedFor }] : [];
  return [...ordinary, ...extra];
}

/** The tone of a pip: the quickened one apart, a spent one quiet. */
export function pipTone(pip: ActionPip): BadgeTone {
  if (pip.state === PipState.Spent) {
    return BadgeTone.Neutral;
  }
  return pip.quickened ? BadgeTone.Info : BadgeTone.Success;
}

/** The message key that words a pip. */
export function pipKey(pip: ActionPip): string {
  if (pip.quickened) {
    return pip.restriction === undefined ? 'character.sheet.turn.pipQuickened' : 'character.sheet.turn.pipQuickenedFor';
  }
  return pip.state === PipState.Left ? 'character.sheet.turn.pipLeft' : 'character.sheet.turn.pipSpent';
}

/** What the turn bar shows of `turn`, and which of its buttons do anything now. */
export function turnBarView(turn: TurnState): TurnBarView {
  return {
    phase: turn.phase,
    pips: pipsOf(turn),
    reactionUsed: turn.reactionUsed,
    attacks: turn.phase === TurnPhase.Turn ? turn.attacks : undefined,
    canEnter: turn.phase === TurnPhase.OutOfEncounter,
    canStart: turn.phase !== TurnPhase.Turn,
    canEnd: turn.phase === TurnPhase.Turn,
    canLeave: turn.phase !== TurnPhase.OutOfEncounter,
  };
}

/** A roll that was made as it was, with no fortune or misfortune. */
function plainRoll(result: RollResult): FortunedRoll {
  return {
    mode: RollMode.Normal,
    rolls: [{ result, kept: true }],
    total: result.total,
    explanation: message(DiceMessage.FortuneNormal),
    sources: { fortune: [], misfortune: [] },
  };
}

/** One line of what a turn boundary did: its words, and the roll card for the dice it rolled. */
export interface TurnLogLine {
  readonly message: MessageDescriptor;
  readonly roll: RollView | undefined;
}

/** The lines of a turn boundary's events, numbering the roll cards from `first`. */
export function turnLog(events: readonly TurnEvent[], first: number): readonly TurnLogLine[] {
  return events.map((event, index): TurnLogLine => {
    if (event.kind !== TurnEventKind.PersistentDamage) {
      return { message: event.message, roll: undefined };
    }
    const view = rollView(first + index, {
      expression: event.roll.expression,
      roll: plainRoll(event.roll),
      degree: undefined,
      damage: event.damage,
    });
    return { message: event.message, roll: view };
  });
}
