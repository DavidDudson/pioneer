import type { DamageApplication, DieFace, RollResult } from '@pioneer/rules/dice';
import { FastHealingType } from '@pioneer/rules/sdk';
import type { ContentId, Dc, HitPoints, ConditionValue } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ActiveCondition, ConditionInstanceId } from './conditions';
import type { EffectInstanceId } from './effects';

/** What happened to a character as a turn started or ended: the turn bar, the spend log and triggered abilities read these. */
export const TurnEventKind = {
  TurnStart: 'turnStart',
  Healed: 'healed',
  EffectExpired: 'effectExpired',
  ConditionEnded: 'conditionEnded',
  ConditionLowered: 'conditionLowered',
  PersistentDamage: 'persistentDamage',
  FlatCheck: 'flatCheck',
} as const;
export type TurnEventKind = ValueOf<typeof TurnEventKind>;

/** The keys each turn event is worded with; their `en` text ships in the character feature's `i18n/en.json`. */
export const TurnMessage = {
  TurnStart: 'character.turn.started',
  FastHealing: 'character.turn.fastHealing',
  Regeneration: 'character.turn.regeneration',
  EffectExpired: 'character.turn.effectExpired',
  ConditionEnded: 'character.turn.conditionEnded',
  ConditionLowered: 'character.turn.conditionLowered',
  PersistentDamage: 'character.turn.persistentDamage',
  FlatCheckPassed: 'character.turn.flatCheckPassed',
  FlatCheckFailed: 'character.turn.flatCheckFailed',
} as const;
export type TurnMessage = ValueOf<typeof TurnMessage>;

/**
 * One thing that happened at a turn boundary. Each carries the message that words it; the effect and condition events
 * name the content by id, as the domain knows no names, so the sheet words them from the content it holds.
 */
export type TurnEvent =
  | { readonly kind: typeof TurnEventKind.TurnStart; readonly message: MessageDescriptor }
  | {
      readonly kind: typeof TurnEventKind.Healed;
      readonly type: ValueOf<typeof FastHealingType>;
      readonly gained: HitPoints;
      readonly message: MessageDescriptor;
    }
  | {
      readonly kind: typeof TurnEventKind.EffectExpired;
      readonly effect: ContentId;
      readonly instance: EffectInstanceId;
      readonly message: MessageDescriptor;
    }
  | {
      readonly kind: typeof TurnEventKind.ConditionEnded;
      readonly condition: ContentId;
      readonly instance: ConditionInstanceId;
      readonly message: MessageDescriptor;
    }
  | {
      readonly kind: typeof TurnEventKind.ConditionLowered;
      readonly condition: ContentId;
      readonly instance: ConditionInstanceId;
      readonly value: ConditionValue;
      readonly message: MessageDescriptor;
    }
  | {
      readonly kind: typeof TurnEventKind.PersistentDamage;
      readonly condition: ContentId;
      readonly instance: ConditionInstanceId;
      /** The dice rolled, for the roll card. */
      readonly roll: RollResult;
      /** The roll applied to the character's defences, as any damage is. */
      readonly damage: DamageApplication;
      readonly message: MessageDescriptor;
    }
  | {
      readonly kind: typeof TurnEventKind.FlatCheck;
      readonly condition: ContentId;
      readonly instance: ConditionInstanceId;
      readonly die: DieFace;
      readonly dc: Dc;
      readonly passed: boolean;
      readonly message: MessageDescriptor;
    };

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
