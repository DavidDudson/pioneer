import { DamageApplication, DamageTotal } from '@pioneer/rules/dice';
import { HitPoints } from '@pioneer/rules/sdk';
import { Uuid, Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

const NONE = HitPoints.parse(0);

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

/** A character's play state: what changes at the table, apart from the build (character-model.md, `PlayState`). */
export const PlayStateSchema = z.strictObject({
  hp: HitPointsStateSchema.default({ damage: NONE, temp: NONE }),
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
} as const;
export type PlayCommandField = ValueOf<typeof PlayCommandField>;

export const PlayCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(PlayCommandField.Damage), damage: DamageApplication }),
  z.object({ field: z.literal(PlayCommandField.Heal), amount: HitPoints }),
  z.object({ field: z.literal(PlayCommandField.SetHp), current: HitPoints }),
  z.object({ field: z.literal(PlayCommandField.SetTempHp), temp: HitPoints }),
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

/** `value` held within 0 and `max`. */
function clamp(value: number, max: HitPoints): HitPoints {
  return HitPoints.parse(Math.min(Math.max(value, 0), max));
}

/** Current Hit Points: the maximum less the damage taken, never below 0. */
export function currentHitPoints(hp: HitPointsState, max: HitPoints): HitPoints {
  return clamp(max - hp.damage, max);
}

/**
 * `play` after `command`, against the character's maximum Hit Points. Damage is held within 0 and the maximum, so
 * current Hit Points stay within 0 and the maximum for any sequence of commands.
 */
export function applyPlayCommand(play: PlayState, command: PlayCommand, max: HitPoints): PlayState {
  const { hp } = play;
  const damage = clamp(hp.damage, max);
  switch (command.field) {
    case PlayCommandField.Damage: {
      const absorbed = Math.min(hp.temp, command.damage.taken);
      const temp = HitPoints.parse(hp.temp - absorbed);
      return { ...play, hp: { temp, damage: clamp(damage + command.damage.taken - absorbed, max) } };
    }
    case PlayCommandField.Heal: {
      return { ...play, hp: { ...hp, damage: clamp(damage - command.amount, max) } };
    }
    case PlayCommandField.SetHp: {
      return { ...play, hp: { ...hp, damage: clamp(max - command.current, max) } };
    }
    case PlayCommandField.SetTempHp: {
      return { ...play, hp: { ...hp, damage, temp: HitPoints.parse(Math.max(hp.temp, command.temp)) } };
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
