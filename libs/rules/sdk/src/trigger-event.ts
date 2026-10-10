import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { Predicate } from './predicate';

/**
 * The events a triggered ability fires on, each from the point of view of the character it belongs to
 * (play-and-campaigns.md, "Triggered abilities"). Content names one in `triggerEvent`; the engine matches it against
 * the events play raises.
 */
export const TriggerEventType = {
  /** The character rolls initiative. */
  Initiative: 'initiative',
  TurnStart: 'turn-start',
  TurnEnd: 'turn-end',
  /** The character casts a spell; the spell is the event's `item`. */
  CastSpell: 'cast-spell',
  /** The character makes a Strike; the weapon is the event's `item`. */
  Strike: 'strike',
  /** The character takes damage. */
  DamageTaken: 'damage-taken',
} as const;
export type TriggerEventType = ValueOf<typeof TriggerEventType>;

/**
 * When a triggered ability fires: an event, narrowed by a predicate over the event's roll options ("after you cast a
 * focus spell" is `cast-spell` with `item:trait:focus`). The rich text `trigger` stays the wording shown.
 */
export const TriggerEvent = z.strictObject({
  event: z.enum(TriggerEventType),
  predicate: Predicate.optional(),
});
export type TriggerEvent = z.infer<typeof TriggerEvent>;

/** The trigger fields actions and effects share. */
export const triggerFields = {
  /** The event it fires on; without one it is never prompted or applied, only used by hand. */
  triggerEvent: TriggerEvent.optional(),
  /** Always prompt, even when it is free and only beneficial. */
  autoApply: z.literal(false).optional(),
};

interface TriggerFields {
  readonly triggerEvent?: TriggerEvent | undefined;
  readonly autoApply?: false | undefined;
}

/** `autoApply` only means something on an ability that fires on an event. */
export const AUTO_APPLY_NEEDS_EVENT = {
  check: ({ triggerEvent, autoApply }: TriggerFields): boolean => autoApply === undefined || triggerEvent !== undefined,
  params: { ...issueParams(message(RulesMessage.TriggerAutoApplyWithoutEvent)), path: ['autoApply'] },
};
