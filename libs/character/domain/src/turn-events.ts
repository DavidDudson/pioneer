import { DamageApplication, DieFace, RollResult, RollTotal } from '@pioneer/rules/dice';
import {
  ConditionValue,
  ContentId,
  Dc,
  DegreeOfSuccess,
  DegreeOfSuccessSchema,
  FastHealingType,
  HitPoints,
} from '@pioneer/rules/sdk';
import { message, MessageDescriptorSchema } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ActiveSpellId } from './active-spells';
import { AirRounds, SuffocationChecks } from './breath';
import { ConditionInstanceId } from './conditions';
import type { ActiveCondition } from './conditions';
import { EffectInstanceId } from './effects';

/** What happened to a character as a turn started or ended: the turn bar, the spend log and triggered abilities read these. */
export const TurnEventKind = {
  TurnStart: 'turnStart',
  Healed: 'healed',
  EffectExpired: 'effectExpired',
  SpellEnded: 'spellEnded',
  ConditionEnded: 'conditionEnded',
  ConditionLowered: 'conditionLowered',
  PersistentDamage: 'persistentDamage',
  FlatCheck: 'flatCheck',
  AirLost: 'airLost',
  FellUnconscious: 'fellUnconscious',
  Suffocation: 'suffocation',
  EnvironmentDamage: 'environmentDamage',
  EnvironmentCondition: 'environmentCondition',
} as const;
export type TurnEventKind = ValueOf<typeof TurnEventKind>;

/** The keys each turn event is worded with; their `en` text ships in the character feature's `i18n/en.json`. */
export const TurnMessage = {
  TurnStart: 'character.turn.started',
  FastHealing: 'character.turn.fastHealing',
  Regeneration: 'character.turn.regeneration',
  EffectExpired: 'character.turn.effectExpired',
  SpellEnded: 'character.turn.spellEnded',
  ConditionEnded: 'character.turn.conditionEnded',
  ConditionLowered: 'character.turn.conditionLowered',
  PersistentDamage: 'character.turn.persistentDamage',
  FlatCheckPassed: 'character.turn.flatCheckPassed',
  FlatCheckFailed: 'character.turn.flatCheckFailed',
  AirLost: 'character.turn.airLost',
  FellUnconscious: 'character.turn.fellUnconscious',
  SuffocationSaved: 'character.turn.suffocationSaved',
  SuffocationFailed: 'character.turn.suffocationFailed',
  SuffocationDied: 'character.turn.suffocationDied',
  EnvironmentDamage: 'character.turn.environmentDamage',
  EnvironmentCondition: 'character.turn.environmentCondition',
} as const;
export type TurnMessage = ValueOf<typeof TurnMessage>;

/**
 * One thing that happened at a turn boundary. Each carries the message that words it; the effect and condition events
 * name the content by id, as the domain knows no names, so the sheet words them from the content it holds.
 */
export const TurnEventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(TurnEventKind.TurnStart), message: MessageDescriptorSchema }),
  z.object({
    kind: z.literal(TurnEventKind.Healed),
    type: z.enum(FastHealingType),
    gained: HitPoints,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.EffectExpired),
    effect: ContentId,
    instance: EffectInstanceId,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.SpellEnded),
    spell: ContentId,
    instance: ActiveSpellId,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.ConditionEnded),
    condition: ContentId,
    instance: ConditionInstanceId,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.ConditionLowered),
    condition: ContentId,
    instance: ConditionInstanceId,
    value: ConditionValue,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.PersistentDamage),
    condition: ContentId,
    instance: ConditionInstanceId,
    /** The dice rolled, for the roll card. */
    roll: RollResult,
    /** The roll applied to the character's defences, as any damage is. */
    damage: DamageApplication,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.FlatCheck),
    condition: ContentId,
    instance: ConditionInstanceId,
    die: DieFace,
    dc: Dc,
    passed: z.boolean(),
    message: MessageDescriptorSchema,
  }),
  z.object({ kind: z.literal(TurnEventKind.AirLost), air: AirRounds, message: MessageDescriptorSchema }),
  z.object({
    kind: z.literal(TurnEventKind.FellUnconscious),
    condition: ContentId,
    instance: ConditionInstanceId,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.Suffocation),
    /** Which save against suffocation this is, the first being 1. */
    check: SuffocationChecks,
    die: DieFace,
    total: RollTotal,
    dc: Dc,
    degree: DegreeOfSuccessSchema,
    /** The Hit Points the failed save cost after the character's defences; none for a save that held. */
    taken: HitPoints,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.EnvironmentDamage),
    environment: ContentId,
    /** The dice rolled, for the roll card. */
    roll: RollResult,
    /** The roll applied to the character's defences, as any damage is. */
    damage: DamageApplication,
    message: MessageDescriptorSchema,
  }),
  z.object({
    kind: z.literal(TurnEventKind.EnvironmentCondition),
    environment: ContentId,
    condition: ContentId,
    instance: ConditionInstanceId,
    message: MessageDescriptorSchema,
  }),
]);
export type TurnEvent = z.infer<typeof TurnEventSchema>;

/** The turn has started. */
export function turnStarted(): TurnEvent {
  return { kind: TurnEventKind.TurnStart, message: message(TurnMessage.TurnStart) };
}

/** Recovery of `type` restored `gained` Hit Points. */
export function healedEvent(type: ValueOf<typeof FastHealingType>, gained: HitPoints): TurnEvent {
  const key = type === FastHealingType.Regeneration ? TurnMessage.Regeneration : TurnMessage.FastHealing;
  return { kind: TurnEventKind.Healed, type, gained, message: message(key, { amount: gained }) };
}

/** An effect ran out and was removed. */
export function effectExpired(effect: ContentId, instance: EffectInstanceId): TurnEvent {
  return { kind: TurnEventKind.EffectExpired, effect, instance, message: message(TurnMessage.EffectExpired) };
}

/** A sustained spell ran out of rounds, or was not sustained, and was removed. */
export function spellEnded(spell: ContentId, instance: ActiveSpellId): TurnEvent {
  return { kind: TurnEventKind.SpellEnded, spell, instance, message: message(TurnMessage.SpellEnded) };
}

/** A condition ended with the turn boundary and was removed. */
export function conditionEnded(condition: ContentId, instance: ConditionInstanceId): TurnEvent {
  return { kind: TurnEventKind.ConditionEnded, condition, instance, message: message(TurnMessage.ConditionEnded) };
}

/** A condition went down to `value` at the turn boundary. */
export function conditionLowered(
  condition: ContentId,
  instance: ConditionInstanceId,
  value: ConditionValue,
): TurnEvent {
  return {
    kind: TurnEventKind.ConditionLowered,
    condition,
    instance,
    value,
    message: message(TurnMessage.ConditionLowered, { value }),
  };
}

/** What a persistent damage condition rolled, and the roll applied to the character's defences. */
export interface PersistentRoll {
  readonly roll: RollResult;
  readonly damage: DamageApplication;
}

/** A persistent damage condition rolled `roll`, which `damage` shows applied to the character's defences. */
export function persistentDamage({ condition, id }: ActiveCondition, { roll, damage }: PersistentRoll): TurnEvent {
  return {
    kind: TurnEventKind.PersistentDamage,
    condition,
    instance: id,
    roll,
    damage,
    message: message(TurnMessage.PersistentDamage, { amount: damage.taken }),
  };
}

/** The flat check to end a persistent damage condition: `die` against `dc`. */
export function flatCheck(
  condition: ContentId,
  instance: ConditionInstanceId,
  { die, dc }: { readonly die: DieFace; readonly dc: Dc },
): TurnEvent {
  const passed = die >= dc;
  const key = passed ? TurnMessage.FlatCheckPassed : TurnMessage.FlatCheckFailed;
  return { kind: TurnEventKind.FlatCheck, condition, instance, die, dc, passed, message: message(key, { die, dc }) };
}

/** The turn ended with `air` rounds of breath left. */
export function airLost(air: AirRounds): TurnEvent {
  return { kind: TurnEventKind.AirLost, air, message: message(TurnMessage.AirLost, { air }) };
}

/** The character ran out of air and fell unconscious: the content's `condition` went on as `instance`. */
export function fellUnconscious(condition: ContentId, instance: ConditionInstanceId): TurnEvent {
  return {
    kind: TurnEventKind.FellUnconscious,
    condition,
    instance,
    message: message(TurnMessage.FellUnconscious),
  };
}

/** Time in `environment` made the character take the damage `roll` rolled, which `damage` shows applied to its defences. */
export function environmentDamaged(environment: ContentId, { roll, damage }: PersistentRoll): TurnEvent {
  return {
    kind: TurnEventKind.EnvironmentDamage,
    environment,
    roll,
    damage,
    message: message(TurnMessage.EnvironmentDamage, { amount: damage.taken }),
  };
}

/** Time in `environment` put the condition `condition` on the character, as `instance`. */
export function environmentConditioned(
  environment: ContentId,
  condition: ContentId,
  instance: ConditionInstanceId,
): TurnEvent {
  return {
    kind: TurnEventKind.EnvironmentCondition,
    environment,
    condition,
    instance,
    message: message(TurnMessage.EnvironmentCondition),
  };
}

/** What a save against suffocation came to: its roll against its DC, and the Hit Points the failure cost. */
export interface SuffocationSave {
  readonly check: SuffocationChecks;
  readonly die: DieFace;
  readonly total: RollTotal;
  readonly dc: Dc;
  readonly degree: DegreeOfSuccess;
  readonly taken: HitPoints;
}

function suffocationKey(degree: DegreeOfSuccess): TurnMessage {
  if (degree === DegreeOfSuccess.CriticalFailure) {
    return TurnMessage.SuffocationDied;
  }
  return degree === DegreeOfSuccess.Failure ? TurnMessage.SuffocationFailed : TurnMessage.SuffocationSaved;
}

/** The character, out of air, made a Fortitude save against suffocation. */
export function suffocationSaved(save: SuffocationSave): TurnEvent {
  const { total, dc, taken } = save;
  return {
    kind: TurnEventKind.Suffocation,
    ...save,
    message: message(suffocationKey(save.degree), { total, dc, amount: taken }),
  };
}
