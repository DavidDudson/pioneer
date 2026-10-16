import type { RandomSource } from '@pioneer/rules/dice';
import { damageTargetOf, deriveDefences, statisticContent } from '@pioneer/rules/engine';
import type { RecoveryInPlay } from '@pioneer/rules/engine';
import { ConditionTrigger, NO_DEFENCES } from '@pioneer/rules/sdk';
import type { DamageTarget } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { characterVitals } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import type { PlayLimits, PlayState } from './play-state';
import { conditionRecovery } from './rest-limits';
import type { RecoveryConditions } from './rest-types';
import { endTurn } from './turn-end';
import { startTurn } from './turn-start';
import type { TurnOutcome } from './turn-start';
import { economyConditions, OUT_OF_ENCOUNTER, refilled, TurnCommandField, TurnPhase, turnEnded } from './turn-state';
import type { EconomyConditions, TurnCommand } from './turn-state';

/** What the turn cycle reads besides the play state: the limits, and what the build and the content give. */
export interface TurnCommandInputs {
  readonly limits: PlayLimits;
  /** The character's fast healing and regeneration (`vitalsInPlay`). */
  readonly recovery: readonly RecoveryInPlay[];
  /** The character's immunities, weaknesses and resistances, which persistent damage goes through. */
  readonly defences: DamageTarget;
  /** What the end of a turn does to each condition the content eases (Frightened is lowered). */
  readonly easing: RecoveryConditions;
  /** The conditions that change the actions a turn starts with. */
  readonly economy: EconomyConditions;
}

/** Start turn: the bookkeeping, then the actions and the reaction refilled from the conditions that are left, and the spend log cleared. */
function started(play: PlayState, inputs: TurnCommandInputs, random: RandomSource): TurnOutcome {
  const begun = startTurn(play, { limits: inputs.limits, recovery: inputs.recovery }, random);
  const { turn, conditions, events } = refilled(begun.play.conditions, inputs.economy);
  return {
    play: { ...begun.play, turn, conditions: [...conditions], spendLog: [] },
    events: [...begun.events, ...events],
  };
}

/** End turn: the bookkeeping, then no actions left and off-turn. */
function ended(play: PlayState, inputs: TurnCommandInputs, random: RandomSource): TurnOutcome {
  const done = endTurn(play, { limits: inputs.limits, defences: inputs.defences, recovery: inputs.easing }, random);
  return { play: { ...done.play, turn: turnEnded(done.play.turn) }, events: done.events };
}

/** A command that does not apply in the current phase. */
function unchanged(play: PlayState): TurnOutcome {
  return { play, events: [] };
}

/** What a turn-cycle edit reads, and the dice it rolls with. */
export interface TurnRun {
  readonly inputs: TurnCommandInputs;
  readonly random: RandomSource;
}

/**
 * `play` after a turn-cycle `command`, and what the bookkeeping did, in order. Dice come from `run.random`. A command
 * from a phase it does not apply to (Start turn mid-turn, End turn off-turn, Enter encounter in one, Leave encounter out of one) changes
 * nothing, so a stale or direct call never runs the bookkeeping twice.
 */
export function applyTurnCommand(play: PlayState, command: TurnCommand, { inputs, random }: TurnRun): TurnOutcome {
  const { phase } = play.turn;
  switch (command.field) {
    case TurnCommandField.EnterEncounter: {
      return phase === TurnPhase.OutOfEncounter
        ? { play: { ...play, turn: { ...play.turn, phase: TurnPhase.OffTurn } }, events: [] }
        : unchanged(play);
    }
    case TurnCommandField.StartTurn: {
      return phase === TurnPhase.Turn ? unchanged(play) : started(play, inputs, random);
    }
    case TurnCommandField.EndTurn: {
      return phase === TurnPhase.Turn ? ended(play, inputs, random) : unchanged(play);
    }
    case TurnCommandField.LeaveEncounter: {
      return phase === TurnPhase.OutOfEncounter
        ? unchanged(play)
        : { play: { ...play, turn: OUT_OF_ENCOUNTER, spendLog: [] }, events: [] };
    }
    case TurnCommandField.SetAttacks: {
      return phase === TurnPhase.Turn
        ? { play: { ...play, turn: { ...play.turn, attacks: command.count } }, events: [] }
        : unchanged(play);
    }
    default: {
      return command satisfies never;
    }
  }
}

/**
 * What the turn cycle reads for a character, from the build and the content: its fast healing and regeneration, the
 * defences persistent damage goes through, what the end of a turn eases and the conditions that change its actions.
 */
export function turnCommandInputs(
  sources: StatisticSources,
  document: CharacterDocument,
  limits: PlayLimits,
): TurnCommandInputs {
  const { registry, inputs } = sources;
  const content = statisticContent(registry);
  return {
    limits,
    recovery: characterVitals(sources, document)?.recovery ?? [],
    defences: content === undefined ? NO_DEFENCES : damageTargetOf(deriveDefences(content, inputs)),
    easing: conditionRecovery(registry, ConditionTrigger.TurnEnd),
    economy: economyConditions(registry),
  };
}
