import { DamageApplication } from '@pioneer/rules/dice';
import { DegreeOfSuccessSchema, HitPoints } from '@pioneer/rules/sdk';
import { Uuid, Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActiveSpellCommandField, ActiveSpellCommandSchema, ActiveSpellsSchema } from './active-spells';
import { ActiveConditionsSchema, ConditionCommandField, ConditionCommandSchema } from './conditions';
import type { ConditionValued } from './conditions';
import {
  afterConsumable,
  ConsumableCommandField,
  ConsumableCommandSchema,
  isConsumableCommand,
} from './consumable-commands';
import type { ConsumableCommand } from './consumable-commands';
import { applyCountingCommand, isCountingCommand } from './counting-commands';
import type { CountingCommand, CountingLimits } from './counting-commands';
import {
  afterRecoveryCheck,
  DeathTrackSchema,
  Doomed,
  Dying,
  withDoomed,
  withDying,
  withWounded,
  Wounded,
} from './death-track';
import { EffectCommandField, EffectCommandSchema } from './effect-commands';
import { ActiveEffectsSchema } from './effects';
import { ExplorationActivitySchema, ExplorationCommandField, ExplorationCommandSchema } from './exploration-commands';
import { afterDamage, afterHealing, afterSetting, trackOf, withTempHitPoints, withTrack } from './hit-point-edits';
import { ResourceCommandField, ResourceCommandSchema } from './resource-commands';
import { ResourcesSpentSchema } from './resources';
import { RestCommandField, RestCommandSchema } from './rest-types';
import { afterBlock, ShieldCommandField, ShieldCommandSchema, ShieldDamageSchema } from './shield-commands';
import type { ShieldContent } from './shield-commands';
import { SpendCommandField, SpendCommandSchema, SpendLogSchema } from './spend-log';
import { ToggleCommandField, ToggleCommandSchema, TogglesSchema } from './toggle-commands';
import { TurnEventSchema } from './turn-events';
// oxlint-disable-next-line import/max-dependencies -- the one place every play edit and every part of play state is gathered
import { OUT_OF_ENCOUNTER, TurnCommandSchema, TurnStateSchema } from './turn-state';

export { currentHitPoints, withTempHitPoints } from './hit-point-edits';

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
  /** The sustained spells the character has cast and keeps up. */
  activeSpells: ActiveSpellsSchema,
  toggles: TogglesSchema,
  /** The damage each shield has taken, by its inventory item; the shield's own Hit Points come from its content. */
  shields: ShieldDamageSchema,
  turn: TurnStateSchema.default(OUT_OF_ENCOUNTER),
  /** The spends since the turn began; the actions they took are already out of `turn`. */
  spendLog: SpendLogSchema.default([]),
  /** What the character is doing while exploring, as the id of the action; none until it picks one. */
  exploration: ExplorationActivitySchema,
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
  /** An active spell dismissed at will (`active-spells.ts`). */
  ...ActiveSpellCommandField,
  /** Rest, daily preparations, Refocus and start of session (`rest-actions.ts`). */
  ...RestCommandField,
  /** An action, spell or activation spent from the turn, or such a spend taken back (`spend-log.ts`). */
  ...SpendCommandField,
  /** Shield Block (`shield-commands.ts`). */
  ...ShieldCommandField,
  /** A consumable used (`consumable-commands.ts`). */
  ...ConsumableCommandField,
  /** A `RollOption` toggle set on or off (`toggle-commands.ts`). */
  ...ToggleCommandField,
  ...ExplorationCommandField,
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
  ...ActiveSpellCommandSchema.options,
  ...RestCommandSchema.options,
  ...SpendCommandSchema.options,
  ...ShieldCommandSchema.options,
  ...ConsumableCommandSchema.options,
  ...ToggleCommandSchema.options,
  ...ExplorationCommandSchema.options,
]);
export type PlayCommand = z.infer<typeof PlayCommandSchema>;

/** Every edit the play endpoint takes: the sheet's edits, and the turn cycle, which also roll dice and say what they did. */
export const PlayEditSchema = z.discriminatedUnion('field', [
  ...PlayCommandSchema.options,
  ...TurnCommandSchema.options,
]);
export type PlayEdit = z.infer<typeof PlayEditSchema>;

/** PATCH body for play state: the edit plus the revision the client last saw. */
export const PatchPlayBody = z.object({
  expectedRevision: Version,
  command: PlayEditSchema,
});
export type PatchPlayBody = z.infer<typeof PatchPlayBody>;

/** A character's play state with the revision it is at, as the play endpoints read and return it. */
export const CharacterPlay = z.object({
  revision: Version,
  play: PlayStateSchema,
});
export type CharacterPlay = z.infer<typeof CharacterPlay>;

/** What a play edit answers with: the play state it left, and what the turn cycle did on the way (none for other edits). */
export const PatchedPlay = CharacterPlay.extend({ events: z.array(TurnEventSchema).default([]) });
export type PatchedPlay = z.infer<typeof PatchedPlay>;

/** What bounds a play edit, as the build and the rules give it. */
export interface PlayLimits extends CountingLimits {
  /** Whether each condition the content has carries a value. */
  readonly valued: ConditionValued;
  /** The shields the character holds, with the Hardness and Hit Points their content gives. */
  readonly shields: ShieldContent;
}

/**
 * `play` after `command`, within the character's limits. Damage is held within 0 and the maximum, so current Hit
 * Points stay within 0 and the maximum for any sequence of commands. Damage that takes Hit Points to 0, or gets
 * through once they are there, advances dying; Hit Points back above 0 end it. Points held in a pool stay within 0 and
 * its maximum.
 */
export function applyPlayCommand(play: PlayState, command: PlayCommand, limits: PlayLimits): PlayState {
  if (isConsumableCommand(command)) {
    return afterConsumable(play, command, limits);
  }
  return isCountingCommand(command)
    ? applyCountingCommand(play, command, limits)
    : applyHitPointsEdit(play, command, limits);
}

/** The edits of Hit Points and the death track: every play edit that does not count. */
type HitPointsCommand = Exclude<PlayCommand, CountingCommand | ConsumableCommand>;

/** `play` after an edit of Hit Points or the death track. */
function applyHitPointsEdit(play: PlayState, command: HitPointsCommand, limits: PlayLimits): PlayState {
  const max = limits.hitPoints;
  switch (command.field) {
    case PlayCommandField.Damage: {
      return afterDamage(play, command.damage, max);
    }
    case PlayCommandField.BlockWithShield: {
      return afterBlock(play, command, limits);
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
