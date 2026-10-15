import { FastHealingType } from '@pioneer/rules/sdk';
import type { ContentId, HitPoints } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ConditionInstanceId } from './conditions';
import type { EffectInstanceId } from './effects';

/** What happened to a character as a turn started or ended: the turn bar, the spend log and triggered abilities read these. */
export const TurnEventKind = {
  TurnStart: 'turnStart',
  Healed: 'healed',
  EffectExpired: 'effectExpired',
  ConditionEnded: 'conditionEnded',
} as const;
export type TurnEventKind = ValueOf<typeof TurnEventKind>;

/** The keys each turn event is worded with; their `en` text ships in the character feature's `i18n/en.json`. */
export const TurnMessage = {
  TurnStart: 'character.turn.started',
  FastHealing: 'character.turn.fastHealing',
  Regeneration: 'character.turn.regeneration',
  EffectExpired: 'character.turn.effectExpired',
  ConditionEnded: 'character.turn.conditionEnded',
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
