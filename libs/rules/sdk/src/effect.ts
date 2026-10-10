import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentText } from './content-text';
import { DamageFormula } from './damage-formula';
import { RulesMessage } from './messages';
import { DurationCount, DurationUnitSchema } from './rich-text';

/** What an effect comes from, as Foundry pf2e splits its effect packs; `other` is a GM's effect. */
export const EffectCategory = { Spell: 'spell', Feat: 'feat', Equipment: 'equipment', Other: 'other' } as const;
export type EffectCategory = ValueOf<typeof EffectCategory>;

/** When in the round a timed effect ends once its time is up. */
export const EffectExpiry = { TurnStart: 'turn-start', TurnEnd: 'turn-end', RoundEnd: 'round-end' } as const;
export type EffectExpiry = ValueOf<typeof EffectExpiry>;

export const EffectDurationType = { Time: 'time', Encounter: 'encounter', Unlimited: 'unlimited' } as const;
export type EffectDurationType = ValueOf<typeof EffectDurationType>;

/** "10 minutes, ending at the start of a turn", "until the encounter ends", "unlimited". */
const EffectDuration = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal(EffectDurationType.Time),
    count: DurationCount,
    unit: DurationUnitSchema,
    expiry: z.enum(EffectExpiry).optional(),
    sustained: z.boolean().optional(),
  }),
  z.strictObject({ type: z.literal(EffectDurationType.Encounter) }),
  z.strictObject({ type: z.literal(EffectDurationType.Unlimited) }),
]);

export const EffectBadgeType = { Counter: 'counter', Formula: 'formula' } as const;
export type EffectBadgeType = ValueOf<typeof EffectBadgeType>;

/** When a formula badge rolls again. */
export const BadgeReevaluation = {
  InitiativeRoll: 'initiative-roll',
  TurnStart: 'turn-start',
  TurnEnd: 'turn-end',
} as const;
export type BadgeReevaluation = ValueOf<typeof BadgeReevaluation>;

/** A number a badge shows. */
const BadgeValue = Pg.smallint().brand<'BadgeValue'>();
const BADGE_LABELS_MAX = 20;

/** A counter the player steps through, starting at `value`; `labels` name each step from `min` up. */
const CounterBadge = z
  .strictObject({
    type: z.literal(EffectBadgeType.Counter),
    value: BadgeValue,
    min: BadgeValue.optional(),
    max: BadgeValue.optional(),
    labels: z.array(ContentText).max(BADGE_LABELS_MAX).readonly().optional(),
    /** Past `max` it goes back to `min`. */
    loop: z.boolean().optional(),
  })
  .refine(({ value, min, max }) => (min === undefined || min <= value) && (max === undefined || value <= max), {
    ...issueParams(message(RulesMessage.EffectBadgeRange)),
    path: ['value'],
  });

/** A value rolled when the effect is applied ("1d4"), dice and a formula as damage writes them. */
const FormulaBadge = z.strictObject({
  type: z.literal(EffectBadgeType.Formula),
  formula: DamageFormula,
  reevaluate: z.enum(BadgeReevaluation).optional(),
});

/**
 * An effect's `data` on the `ContentEntry` envelope: where it comes from and how long it lasts. What it does is its
 * `rules`; the level formulas read is the envelope's `level`.
 */
export const EffectData = z.strictObject({
  category: z.enum(EffectCategory),
  duration: EffectDuration,
  /** A number of rules significance shown on the effect: a counter or a rolled value. */
  badge: z.discriminatedUnion('type', [CounterBadge, FormulaBadge]).optional(),
});
export type EffectData = z.infer<typeof EffectData>;
