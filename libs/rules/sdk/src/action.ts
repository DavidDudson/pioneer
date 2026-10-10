import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { RulesMessage } from './messages';
import { ActionCost, ActionCostSchema, RichText } from './rich-text';

/** How Foundry pf2e sorts actions on the sheet. */
export const ActionCategory = {
  Interaction: 'interaction',
  Defensive: 'defensive',
  Offensive: 'offensive',
  Familiar: 'familiar',
} as const;
export type ActionCategory = ValueOf<typeof ActionCategory>;
export const ActionCategorySchema = z.enum(ActionCategory);

/**
 * The span a frequency's uses refresh over, Foundry pf2e's set in words: `twenty-four-hours` is "once every 24
 * hours", `day` is "once per day" (refreshed by daily preparations).
 */
export const FrequencyPeriod = {
  Turn: 'turn',
  Round: 'round',
  Minute: 'minute',
  TenMinutes: 'ten-minutes',
  Hour: 'hour',
  TwentyFourHours: 'twenty-four-hours',
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Year: 'year',
} as const;
export type FrequencyPeriod = ValueOf<typeof FrequencyPeriod>;
export const FrequencyPeriodSchema = z.enum(FrequencyPeriod);

/** How many times something can be used per period. */
export const Uses = Pg.smallint().positive().brand<'Uses'>();
export type Uses = z.infer<typeof Uses>;

/** "Once per round", "three times per day". */
export const Frequency = z.strictObject({ max: Uses, per: FrequencyPeriodSchema });
export type Frequency = z.infer<typeof Frequency>;

/**
 * An action's `data` on the `ContentEntry` envelope. Its effects are its `rules` and description; this is how it is
 * used. A reaction always has a trigger.
 */
export const ActionData = z
  .strictObject({
    /** The glyph it costs; absent for a passive ability. */
    cost: ActionCostSchema.optional(),
    category: ActionCategorySchema.optional(),
    requirements: RichText.optional(),
    trigger: RichText.optional(),
    frequency: Frequency.optional(),
    /** The effect using it applies to the user (Raise a Shield's Shield Raised). */
    selfEffect: ContentId.optional(),
  })
  .refine((data) => data.cost !== ActionCost.Reaction || data.trigger !== undefined, {
    ...issueParams(message(RulesMessage.ActionReactionTrigger)),
    path: ['trigger'],
  });
export type ActionData = z.infer<typeof ActionData>;
