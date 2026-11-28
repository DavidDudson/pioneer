import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CompanionId } from './companion';

/**
 * Where a companion is in play (ADR-0079, familiars.md "Lifecycle state machine"). A character with no companion has
 * no entry; "none" is the absence of a row, not a status.
 */
export const CompanionStatus = {
  /** With its master and able to act. */
  Active: 'active',
  /** Away from its master: left behind, or out of Recall Familiar's reach. */
  Absent: 'absent',
  /** Carried on the master's body (Absorb Familiar, a familiar tattoo); it can only turn back. */
  Absorbed: 'absorbed',
  /** At 0 Hit Points or destroyed. The row stays: a patron replaces it, a resurrection brings it back. */
  Dead: 'dead',
} as const;

export type CompanionStatus = ValueOf<typeof CompanionStatus>;

export const CompanionStatusSchema = z.enum(CompanionStatus);

/** What play state holds of one companion. Damage and conditions join it with the familiar's Hit Points. */
export const CompanionPlaySchema = z.strictObject({
  status: CompanionStatusSchema.default(CompanionStatus.Active),
});

export type CompanionPlay = z.infer<typeof CompanionPlaySchema>;

/** The companions' play state, by companion. A companion with no entry is active. */
export const CompanionsPlaySchema = z.record(CompanionId, CompanionPlaySchema).default({});

export type CompanionsPlay = z.infer<typeof CompanionsPlaySchema>;

/** The play edits that move a companion between statuses. */
export const CompanionCommandField = {
  SetCompanionStatus: 'setCompanionStatus',
} as const;

export type CompanionCommandField = ValueOf<typeof CompanionCommandField>;

export const CompanionCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(CompanionCommandField.SetCompanionStatus),
    companion: CompanionId,
    status: CompanionStatusSchema,
  }),
]);

export type CompanionCommand = z.infer<typeof CompanionCommandSchema>;

/** Whether `command` moves a companion between statuses. */
export function isCompanionCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, CompanionCommand> {
  return command.field === CompanionCommandField.SetCompanionStatus;
}

/**
 * The statuses a companion can move to from each status. The dead are only raised to active (a patron's replacement,
 * a resurrection); the absorbed and absent come back through active; any living companion can die.
 */
const TRANSITIONS: Readonly<Record<CompanionStatus, ReadonlyArray<CompanionStatus>>> = {
  [CompanionStatus.Active]: [CompanionStatus.Absent, CompanionStatus.Absorbed, CompanionStatus.Dead],
  [CompanionStatus.Absent]: [CompanionStatus.Active, CompanionStatus.Dead],
  [CompanionStatus.Absorbed]: [CompanionStatus.Active, CompanionStatus.Dead],
  [CompanionStatus.Dead]: [CompanionStatus.Active],
};

/** Whether a companion can move from `from` to `to`. Staying where it is is allowed and changes nothing. */
export function canBecome(from: CompanionStatus, to: CompanionStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** The status of `companion`: its entry in play state, or active when it has none. */
export function companionStatus(companions: CompanionsPlay, companion: CompanionId): CompanionStatus {
  return companions[companion]?.status ?? CompanionStatus.Active;
}

/** Whether `companion` is with its master and able to act: what an effect that needs a usable familiar reads. */
export function isCompanionUsable(companions: CompanionsPlay, companion: CompanionId): boolean {
  return companionStatus(companions, companion) === CompanionStatus.Active;
}

/** Why a status edit is refused. */
export const CompanionProblem = {
  /** The character owns no live companion by that id. */
  Unknown: 'unknown',
  /** The companion cannot move from its status to the one asked for. */
  Illegal: 'illegal',
} as const;

export type CompanionProblem = ValueOf<typeof CompanionProblem>;

/** What refuses `command`, given the ids of the character's live companions; undefined when it is allowed. */
export function companionProblem(
  companions: CompanionsPlay,
  command: CompanionCommand,
  live: ReadonlyArray<CompanionId>,
): CompanionProblem | undefined {
  if (!live.includes(command.companion)) {
    return CompanionProblem.Unknown;
  }

  return canBecome(companionStatus(companions, command.companion), command.status)
    ? undefined
    : CompanionProblem.Illegal;
}

/** `companions` after `command`. The edit is already allowed (`companionProblem`). */
export function applyCompanionCommand(companions: CompanionsPlay, command: CompanionCommand): CompanionsPlay {
  return { ...companions, [command.companion]: { status: command.status } };
}
