import { DiceExpressionText } from '@pioneer/rules/dice';
import { Attribute, Dc } from '@pioneer/rules/sdk';
import type { AttributeModifiers } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ConditionInstanceId } from './conditions';

const AIR_ROUNDS_MAX = 99;
const CHECKS_MAX = 99;
const NONE = 0;
const ONE = 1;
const TWO = 2;

/** Rounds of air left, which a character holding its breath loses as the turns pass. */
export const AirRounds = z.int().min(NONE).max(AIR_ROUNDS_MAX).brand<'AirRounds'>();
export type AirRounds = z.infer<typeof AirRounds>;

/** How many of the Fortitude saves against suffocation the character has made so far. */
export const SuffocationChecks = z.int().min(NONE).max(CHECKS_MAX).brand<'SuffocationChecks'>();
export type SuffocationChecks = z.infer<typeof SuffocationChecks>;

/**
 * A character holding its breath (Player Core, Aquatic Combat, page 437): the rounds of air it has left, and with none
 * left, the saves against suffocation made since. A character breathing freely has none.
 */
export const BreathStateSchema = z.strictObject({
  air: AirRounds,
  checks: SuffocationChecks.default(SuffocationChecks.parse(NONE)),
  /** The Unconscious condition running out of air put on the character, which breathing again takes off. */
  unconscious: ConditionInstanceId.optional(),
});
export type BreathState = z.infer<typeof BreathStateSchema>;

/** The character's breath in play state; undefined while it breathes freely. */
export const BreathSchema = BreathStateSchema.optional();

/** The play edits that hold a breath, change the air left, or let the character breathe again. */
export const BreathCommandField = {
  /** The breath set as it is: air left and saves made. Holding a breath, losing air and undoing either all set it. */
  SetBreath: 'setBreath',
  /** Access to air restored: the character stops suffocating. */
  ClearBreath: 'clearBreath',
} as const;
export type BreathCommandField = ValueOf<typeof BreathCommandField>;

export const BreathCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(BreathCommandField.SetBreath), air: AirRounds, checks: SuffocationChecks }),
  z.object({ field: z.literal(BreathCommandField.ClearBreath) }),
]);
export type BreathCommand = z.infer<typeof BreathCommandSchema>;

/** Whether `command` sets the breath or clears it. */
export function isBreathCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, BreathCommand> {
  return command.field === BreathCommandField.SetBreath || command.field === BreathCommandField.ClearBreath;
}

/** The breath after `command`, which keeps the Unconscious condition it put on while the character is still out of air. */
export function applyBreathCommand(command: BreathCommand, before: BreathState | undefined): BreathState | undefined {
  if (command.field === BreathCommandField.ClearBreath) {
    return undefined;
  }
  const unconscious = command.air === NONE ? before?.unconscious : undefined;
  return { air: command.air, checks: command.checks, ...(unconscious === undefined ? {} : { unconscious }) };
}

/** The Unconscious condition the breath put on that `command` ends: it is gone once the character has air again. */
export function breathRestored(
  command: BreathCommand,
  before: BreathState | undefined,
): ConditionInstanceId | undefined {
  return applyBreathCommand(command, before)?.unconscious === undefined ? before?.unconscious : undefined;
}

const BASE_AIR = 5;

/** The rounds a character can hold its breath: 5 plus its Constitution modifier, and at least none. */
export function maxAir(attributes: AttributeModifiers): AirRounds {
  const rounds = BASE_AIR + attributes.get(Attribute.Constitution);
  return AirRounds.parse(Math.min(Math.max(rounds, NONE), AIR_ROUNDS_MAX));
}

/** Whether the character is out of air, so unconscious and suffocating. */
export function isSuffocating(breath: BreathState | undefined): boolean {
  return breath?.air === NONE;
}

/** `breath` after a critical hit: the character loses a round of air. */
export function criticallyHit(breath: BreathState): BreathState {
  return { ...breath, air: AirRounds.parse(Math.max(breath.air - ONE, NONE)) };
}

/** `air` after the turn ends: a round less, or two when the character attacked or cast a spell this turn. */
export function airAfterTurn(air: AirRounds, exerted: boolean): AirRounds {
  return AirRounds.parse(Math.max(air - (exerted ? TWO : ONE), NONE));
}

const SUFFOCATION_DC = 20;
const SUFFOCATION_DC_STEP = 5;
const SUFFOCATION_DIE = 10;

/** The Fortitude DC of the `check`th save against suffocation (the first is 1): 20, and 5 more each time. */
export function suffocationDc(check: SuffocationChecks): Dc {
  return Dc.parse(SUFFOCATION_DC + SUFFOCATION_DC_STEP * (check - ONE));
}

/** The damage of a failed `check`th save against suffocation: a 1d10 more each time, so `check`d10. */
export function suffocationDamage(check: SuffocationChecks): DiceExpressionText {
  return DiceExpressionText.parse(`${check}d${SUFFOCATION_DIE}`);
}
