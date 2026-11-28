import { HitPoints } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CompanionId } from './companion';
import { ActiveConditionsSchema, applyConditionCommand, ConditionCommandSchema } from './conditions';
import type { ConditionCommand } from './conditions';

const NONE = HitPoints.parse(0);

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

/**
 * What play state holds of one companion: where it is, the damage it has taken and the temporary Hit Points it holds
 * (its maximum is derived, never stored: ADR-0004), its conditions, and whether its master has commanded it this turn.
 */
export const CompanionPlaySchema = z.strictObject({
  status: CompanionStatusSchema.default(CompanionStatus.Active),
  damage: HitPoints.default(NONE),
  temp: HitPoints.default(NONE),
  conditions: ActiveConditionsSchema,
  /** Its master spent an action to Command it this turn, so it has 2 actions until the turn ends. */
  commanded: z.boolean().default(false),
});

export type CompanionPlay = z.infer<typeof CompanionPlaySchema>;

/** The companions' play state, by companion. A companion with no entry is active. */
export const CompanionsPlaySchema = z.record(CompanionId, CompanionPlaySchema).default({});

export type CompanionsPlay = z.infer<typeof CompanionsPlaySchema>;

/** The play edits that move a companion between statuses. */
export const CompanionCommandField = {
  SetCompanionStatus: 'setCompanionStatus',
  /** The damage a companion has taken, as the total: the sheet knows its maximum and keeps it within 0 and that. */
  SetCompanionDamage: 'setCompanionDamage',
  SetCompanionTempHp: 'setCompanionTempHp',
  /** Adds, changes or removes one of a companion's conditions. */
  CompanionCondition: 'companionCondition',
  SetCompanionCommanded: 'setCompanionCommanded',
} as const;

export type CompanionCommandField = ValueOf<typeof CompanionCommandField>;

export const CompanionCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(CompanionCommandField.SetCompanionStatus),
    companion: CompanionId,
    status: CompanionStatusSchema,
  }),
  z.object({ field: z.literal(CompanionCommandField.SetCompanionDamage), companion: CompanionId, damage: HitPoints }),
  z.object({ field: z.literal(CompanionCommandField.SetCompanionTempHp), companion: CompanionId, temp: HitPoints }),
  z.object({
    field: z.literal(CompanionCommandField.CompanionCondition),
    companion: CompanionId,
    change: ConditionCommandSchema,
  }),
  z.object({
    field: z.literal(CompanionCommandField.SetCompanionCommanded),
    companion: CompanionId,
    commanded: z.boolean(),
  }),
]);

export type CompanionCommand = z.infer<typeof CompanionCommandSchema>;

const COMPANION_FIELDS: ReadonlySet<unknown> = new Set(Object.values(CompanionCommandField));

/** Whether `command` edits a companion's play state. */
export function isCompanionCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, CompanionCommand> {
  return COMPANION_FIELDS.has(command.field);
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
  /** The companion is not with its master, so it cannot be commanded. */
  Inactive: 'inactive',
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

  const status = companionStatus(companions, command.companion);

  if (command.field === CompanionCommandField.SetCompanionStatus) {
    return canBecome(status, command.status) ? undefined : CompanionProblem.Illegal;
  }

  const takesOrders = command.field === CompanionCommandField.SetCompanionCommanded && command.commanded;

  return takesOrders && status !== CompanionStatus.Active ? CompanionProblem.Inactive : undefined;
}

/** A companion's play state when play state holds none: active, unhurt, with no conditions. */
export const FRESH_COMPANION: CompanionPlay = CompanionPlaySchema.parse({});

/** The play state of `companion`: its entry, or a fresh one. */
export function companionPlay(companions: CompanionsPlay, companion: CompanionId): CompanionPlay {
  return companions[companion] ?? FRESH_COMPANION;
}

/** The condition edit a companion condition command carries, for the checks that read it. */
export function companionConditionChange(command: CompanionCommand): ConditionCommand | undefined {
  return command.field === CompanionCommandField.CompanionCondition ? command.change : undefined;
}

/**
 * `entry` moved to `status`. A dead companion was commanded no more, and one brought back is a new body: unhurt, with no
 * conditions, since what it suffered died with it.
 */
function withStatus(entry: CompanionPlay, status: CompanionStatus): CompanionPlay {
  if (status === CompanionStatus.Dead) {
    return { ...entry, status, commanded: false };
  }

  return entry.status === CompanionStatus.Dead ? { ...FRESH_COMPANION, status } : { ...entry, status };
}

/** Whether a companion with `damage` taken has no Hit Points left of its `max`: a familiar at 0 dies (no dying condition). */
export function isDown(damage: HitPoints, max: HitPoints): boolean {
  return damage >= max;
}

/** `entry` after `command`: the one change it makes to a companion. */
function changed(entry: CompanionPlay, command: CompanionCommand): CompanionPlay {
  switch (command.field) {
    case CompanionCommandField.SetCompanionStatus: {
      return withStatus(entry, command.status);
    }

    case CompanionCommandField.SetCompanionDamage: {
      return { ...entry, damage: command.damage };
    }

    case CompanionCommandField.SetCompanionTempHp: {
      return { ...entry, temp: command.temp };
    }

    case CompanionCommandField.CompanionCondition: {
      return { ...entry, conditions: [...applyConditionCommand(entry.conditions, command.change)] };
    }

    case CompanionCommandField.SetCompanionCommanded: {
      return { ...entry, commanded: command.commanded };
    }

    default: {
      return command satisfies never;
    }
  }
}

/** `companions` after `command`. The edit is already allowed (`companionProblem`). */
export function applyCompanionCommand(companions: CompanionsPlay, command: CompanionCommand): CompanionsPlay {
  return { ...companions, [command.companion]: changed(companionPlay(companions, command.companion), command) };
}
