import {
  AirRounds,
  BreathCommandField,
  isSuffocating,
  SuffocationChecks,
  suffocationDc,
} from '@pioneer/character/domain';
import type { BreathState, PlayCommand } from '@pioneer/character/domain';
import type { Dc } from '@pioneer/rules/sdk';

const NO_AIR = AirRounds.parse(0);
const ONE_ROUND = 1;
const NEXT_CHECK = 1;
const NO_CHECKS = SuffocationChecks.parse(0);

/** What the sheet says about a held breath: the air left and, with none, the save the next turn end asks for. */
export interface BreathView {
  readonly air: AirRounds;
  readonly suffocating: boolean;
  readonly checks: SuffocationChecks;
  /** The DC of the next Fortitude save against suffocation. */
  readonly nextDc: Dc;
}

export function breathView(breath: BreathState): BreathView {
  return {
    air: breath.air,
    suffocating: isSuffocating(breath),
    checks: breath.checks,
    nextDc: suffocationDc(SuffocationChecks.parse(breath.checks + NEXT_CHECK)),
  };
}

/** The edit that leaves the breath as `breath`: set as it is, or cleared when the character breathes freely. */
export function breathCommand(breath: BreathState | undefined): PlayCommand {
  return breath === undefined
    ? { field: BreathCommandField.ClearBreath }
    : { field: BreathCommandField.SetBreath, air: breath.air, checks: breath.checks };
}

/** Holding the breath for `air` rounds, with no save against suffocation made yet. */
export function heldBreath(air: AirRounds): BreathState {
  return { air, checks: NO_CHECKS };
}

/** `breath` a round of air shorter, which is none at the least. */
export function oneRoundLess(breath: BreathState): BreathState {
  return { ...breath, air: AirRounds.parse(Math.max(breath.air - ONE_ROUND, NO_AIR)) };
}

/** `breath` with no air left: speaking (or casting a spell) loses all that remained. */
export function noAirLeft(breath: BreathState): BreathState {
  return { ...breath, air: NO_AIR };
}
