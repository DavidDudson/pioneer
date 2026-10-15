import { DamageApplication, DamageTotal } from '@pioneer/rules/dice';
import { DegreeOfSuccessSchema, HitPoints } from '@pioneer/rules/sdk';
import { Uuid, Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActiveConditionsSchema, ConditionCommandField, ConditionCommandSchema } from './conditions';
import type { ConditionValued } from './conditions';
import { applyCountingCommand, isCountingCommand } from './counting-commands';
import type { CountingCommand } from './counting-commands';
import {
  afterRecoveryCheck,
  DeathTrackSchema,
  Doomed,
  Dying,
  knockedOut,
  recovered,
  withDoomed,
  withDying,
  withWounded,
  Wounded,
} from './death-track';
import type { DeathTrack } from './death-track';
import { ActiveEffectsSchema, EffectCommandField, EffectCommandSchema } from './effects';
import type { EffectContent } from './effects';
import { ResourceCommandField, ResourceCommandSchema } from './resource-commands';
import { ResourcesSpentSchema } from './resources';
import { RestCommandField, RestCommandSchema } from './rest-types';
import type { RestLimits } from './rest-types';
import { ToggleCommandField, ToggleCommandSchema, TogglesSchema } from './toggle-commands';

const NONE = HitPoints.parse(0);

/** The most Hit Points one play edit can damage, heal or set: what a `HitPoints` holds. */
export const HIT_POINTS_EDIT_MAX: HitPoints = HitPoints.parse(32_767);

/** A `character_play` row's own id, for the audit trail; a character has one row, found by its character id. */
export const PlayStateId = Uuid.brand<'PlayStateId'>();
export type PlayStateId = z.infer<typeof PlayStateId>;

/**
 * Hit Points in play as inputs: the damage taken since full and the temporary Hit Points. Current Hit Points are the
 * maximum the engine derives less the damage (`currentHitPoints`), so a level or Constitution change moves them with
 * the maximum, and a character with no play state yet is at full.
 */
export const HitPointsStateSchema = z.strictObject({
  damage: HitPoints.default(NONE),
  temp: HitPoints.default(NONE),
});
export type HitPointsState = z.infer<typeof HitPointsStateSchema>;

/**
 * A character's play state: what changes at the table, apart from the build (character-model.md, `PlayState`). The
 * death track (`dying`, `wounded`, `doomed`, `dead`) sits beside Hit Points, and `resources` holds the points spent
 * from each pool (hero points, focus points), and `toggles` the `RollOption` toggles as the player left them.
 */
export const PlayStateSchema = z.strictObject({
  hp: HitPointsStateSchema.default({ damage: NONE, temp: NONE }),
  resources: ResourcesSpentSchema.default(ResourcesSpentSchema.parse({})),
  conditions: ActiveConditionsSchema,
  effects: ActiveEffectsSchema,
  toggles: TogglesSchema,
  ...DeathTrackSchema.shape,
});
export type PlayState = z.infer<typeof PlayStateSchema>;

/** Play state before anything has happened at the table: full Hit Points, no temporary Hit Points. */
export const FRESH_PLAY: PlayState = PlayStateSchema.parse({});

/** Every play-state edit the sheet makes. One PATCH per edit; its name lands in `audit.log.command`. */
export const PlayCommandField = {
  /** A damage application from `libs/rules/dice` (IWR already applied); temporary Hit Points take it first. */
  Damage: 'damage',
  Heal: 'heal',
  /** Current Hit Points set outright, as when correcting a mistake. */
  SetHp: 'setHp',
  /** Temporary Hit Points gained: they don't stack, so the higher of the two is kept. */
  SetTempHp: 'setTempHp',
  /** A flat check against DC 10 plus dying, rolled from the sheet; its degree moves the dying value. */
  RecoveryCheck: 'recoveryCheck',
  /** The three conditions set outright, as when correcting a mistake or taking doomed from an effect. */
  SetDying: 'setDying',
  SetWounded: 'setWounded',
  SetDoomed: 'setDoomed',
  /** Pool edits: spend, regain and set hero points and focus points (`resource-commands.ts`). */
  ...ResourceCommandField,
  /** Conditions added, changed and removed (`conditions.ts`). */
  ...ConditionCommandField,
  /** Effects applied, changed and removed (`effects.ts`). */
  ...EffectCommandField,
  /** Rest, daily preparations, Refocus and start of session (`rest-actions.ts`). */
  ...RestCommandField,
  /** A `RollOption` toggle set on or off (`toggle-commands.ts`). */
  ...ToggleCommandField,
} as const;
export type PlayCommandField = ValueOf<typeof PlayCommandField>;

export const PlayCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(PlayCommandField.Damage),
    damage: DamageApplication,
  }),
  z.object({ field: z.literal(PlayCommandField.Heal), amount: HitPoints }),
  z.object({ field: z.literal(PlayCommandField.SetHp), current: HitPoints }),
  z.object({ field: z.literal(PlayCommandField.SetTempHp), temp: HitPoints }),
  z.object({
    field: z.literal(PlayCommandField.RecoveryCheck),
    degree: DegreeOfSuccessSchema,
  }),
  z.object({ field: z.literal(PlayCommandField.SetDying), dying: Dying }),
  z.object({ field: z.literal(PlayCommandField.SetWounded), wounded: Wounded }),
  z.object({ field: z.literal(PlayCommandField.SetDoomed), doomed: Doomed }),
  ...ResourceCommandSchema.options,
  ...ConditionCommandSchema.options,
  ...EffectCommandSchema.options,
  ...RestCommandSchema.options,
  ...ToggleCommandSchema.options,
]);
export type PlayCommand = z.infer<typeof PlayCommandSchema>;

/** PATCH body for play state: the edit plus the revision the client last saw. */
export const PatchPlayBody = z.object({
  expectedRevision: Version,
  command: PlayCommandSchema,
});
export type PatchPlayBody = z.infer<typeof PatchPlayBody>;

/** A character's play state with the revision it is at, as the play endpoints read and return it. */
export const CharacterPlay = z.object({
  revision: Version,
  play: PlayStateSchema,
});
export type CharacterPlay = z.infer<typeof CharacterPlay>;

/** What bounds a play edit, as the build and the rules give it. */
export interface PlayLimits extends RestLimits {
  /** Whether each condition the content has carries a value. */
  readonly valued: ConditionValued;
  /** The effects the content has, with the clock and badge each starts from. */
  readonly effects: EffectContent;
}

/** `value`, or `max` when it is more. */
function atMost(value: HitPoints, max: HitPoints): HitPoints {
  return HitPoints.parse(Math.min(value, max));
}

/** `from` less `amount`, never below 0. */
function less(from: HitPoints, amount: HitPoints | DamageTotal): HitPoints {
  return HitPoints.parse(Math.max(from - amount, 0));
}

/** `from` plus `amount`, never past `max`. */
function plus(from: HitPoints, amount: DamageTotal, max: HitPoints): HitPoints {
  return HitPoints.parse(Math.min(from + amount, max));
}

/** Current Hit Points: the maximum less the damage taken, never below 0. */
export function currentHitPoints(hp: HitPointsState, max: HitPoints): HitPoints {
  return less(max, atMost(hp.damage, max));
}

/** `play` with `temp` temporary Hit Points gained: they don't stack, so the higher of the two is kept. Needs no maximum. */
export function withTempHitPoints(play: PlayState, temp: HitPoints): PlayState {
  return {
    ...play,
    hp: { ...play.hp, temp: HitPoints.parse(Math.max(play.hp.temp, temp)) },
  };
}

/** The death track of `play`. */
function trackOf({ dying, wounded, doomed, dead }: PlayState): DeathTrack {
  return { dying, wounded, doomed, dead };
}

/** `play` with its death track replaced by `track`. */
function withTrack(play: PlayState, track: DeathTrack): PlayState {
  return { ...play, ...track };
}

/** `play` after Hit Points moved from `before` to `after` without being damaged: coming back above 0 ends dying. */
function afterRestoring(play: PlayState, before: HitPoints, after: HitPoints): PlayState {
  const revived = before === NONE && after > NONE;
  return revived ? withTrack(play, recovered(trackOf(play))) : play;
}

/** `play` after `application` of damage: temporary Hit Points take it first, and what gets through at 0 advances dying. */
function afterDamage(play: PlayState, application: DamageApplication, max: HitPoints): PlayState {
  const { hp } = play;
  const { taken, critical } = application;
  const absorbed = HitPoints.parse(Math.min(hp.temp, taken));
  const through = DamageTotal.parse(taken - absorbed);
  const damage = plus(atMost(hp.damage, max), through, max);
  const hurt: PlayState = {
    ...play,
    hp: { temp: less(hp.temp, absorbed), damage },
  };
  const down = through > NONE && currentHitPoints(hurt.hp, max) === NONE;
  return down ? withTrack(hurt, knockedOut(trackOf(hurt), critical)) : hurt;
}

/** `play` after healing `amount`: Hit Points back above 0 end dying. */
function afterHealing(play: PlayState, amount: HitPoints, max: HitPoints): PlayState {
  const { hp } = play;
  const healed: PlayState = {
    ...play,
    hp: { ...hp, damage: less(atMost(hp.damage, max), amount) },
  };
  return afterRestoring(healed, currentHitPoints(hp, max), currentHitPoints(healed.hp, max));
}

/** `play` with Hit Points set to `current`: a drop to 0 is knocked out, a rise above it ends dying. */
function afterSetting(play: PlayState, current: HitPoints, max: HitPoints): PlayState {
  const { hp } = play;
  const before = currentHitPoints(hp, max);
  const set: PlayState = {
    ...play,
    hp: { ...hp, damage: less(max, atMost(current, max)) },
  };
  const after = currentHitPoints(set.hp, max);
  const down = before > NONE && after === NONE;
  return down ? withTrack(set, knockedOut(trackOf(set), false)) : afterRestoring(set, before, after);
}

/**
 * `play` after `command`, within the character's limits. Damage is held within 0 and the maximum, so current Hit
 * Points stay within 0 and the maximum for any sequence of commands. Damage that takes Hit Points to 0, or gets
 * through once they are there, advances dying; Hit Points back above 0 end it. Points held in a pool stay within 0 and
 * its maximum.
 */
export function applyPlayCommand(play: PlayState, command: PlayCommand, limits: PlayLimits): PlayState {
  return isCountingCommand(command)
    ? applyCountingCommand(play, command, limits)
    : applyHitPointsEdit(play, command, limits.hitPoints);
}

/** The edits of Hit Points and the death track: every play edit that does not count. */
type HitPointsCommand = Exclude<PlayCommand, CountingCommand>;

/** `play` after an edit of Hit Points or the death track. */
function applyHitPointsEdit(play: PlayState, command: HitPointsCommand, max: HitPoints): PlayState {
  switch (command.field) {
    case PlayCommandField.Damage: {
      return afterDamage(play, command.damage, max);
    }
    case PlayCommandField.Heal: {
      return afterHealing(play, command.amount, max);
    }
    case PlayCommandField.SetHp: {
      return afterSetting(play, command.current, max);
    }
    case PlayCommandField.SetTempHp: {
      return withTempHitPoints(play, command.temp);
    }
    case PlayCommandField.RecoveryCheck: {
      return withTrack(play, afterRecoveryCheck(trackOf(play), command.degree));
    }
    case PlayCommandField.SetDying: {
      return withTrack(play, withDying(trackOf(play), command.dying));
    }
    case PlayCommandField.SetWounded: {
      return withTrack(play, withWounded(trackOf(play), command.wounded));
    }
    case PlayCommandField.SetDoomed: {
      return withTrack(play, withDoomed(trackOf(play), command.doomed));
    }
    default: {
      return command satisfies never;
    }
  }
}

/** Damage entered by hand, with no roll behind it: one untyped instance, taken in full. */
export function untypedDamage(amount: HitPoints): DamageApplication {
  const total = DamageTotal.parse(amount);
  const none = DamageTotal.parse(0);
  return {
    critical: false,
    immediate: [{ rolled: total, dealt: total, taken: total, lines: [] }],
    persistent: [],
    taken: total,
    persistentTaken: none,
  };
}
