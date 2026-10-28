import { RollTotal } from '@pioneer/rules/dice';
import type { RandomSource } from '@pioneer/rules/dice';
import { damageTargetOf, statisticContent } from '@pioneer/rules/engine';
import type { RecoveryInPlay } from '@pioneer/rules/engine';
import { ConditionTrigger, NO_DEFENCES, Selector } from '@pioneer/rules/sdk';
import type { DamageTarget } from '@pioneer/rules/sdk';

import { characterDefences } from './character-defences';
import type { CharacterDocument } from './character-document';
import { characterStatistics, characterVitals } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import { passTime } from './environment-time';
import { environmentContent } from './environments';
import type { EnvironmentContent } from './environments';
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
  /** The character's Fortitude modifier, worked out only when a save against suffocation needs it. */
  readonly fortitude: () => RollTotal;
  /** What the environments of the content do to a character that stays in them. */
  readonly environments: EnvironmentContent;
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
  const done = endTurn(
    play,
    { limits: inputs.limits, defences: inputs.defences, recovery: inputs.easing, fortitude: inputs.fortitude },
    random,
  );
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
    case TurnCommandField.PassTime: {
      return passTime(play, command.duration, {
        limits: inputs.limits,
        defences: inputs.defences,
        environments: inputs.environments,
        random,
      });
    }
    default: {
      return command satisfies never;
    }
  }
}

const FORTITUDE = Selector.parse('fortitude');
const NO_MODIFIER = RollTotal.parse(0);

/** The character's Fortitude modifier; none when the content has no Fortitude statistic or it has no value. */
function fortitudeOf(sources: StatisticSources, document: CharacterDocument): RollTotal {
  const result = characterStatistics(document, sources).get(FORTITUDE);
  return result?.ok === true ? RollTotal.parse(result.total) : NO_MODIFIER;
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
  const { registry } = sources;
  const content = statisticContent(registry);
  return {
    limits,
    recovery: characterVitals(sources, document)?.recovery ?? [],
    defences: content === undefined ? NO_DEFENCES : damageTargetOf(characterDefences(document, sources)),
    easing: conditionRecovery(registry, ConditionTrigger.TurnEnd),
    economy: economyConditions(registry),
    fortitude: () => fortitudeOf(sources, document),
    environments: environmentContent(registry),
  };
}
