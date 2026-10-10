import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { RulesMessage } from './messages';
import { ActionCost, ActionCostSchema, RichText } from './rich-text';
import { SkillSelector } from './selector';
import { uniqueItems } from './unique-items';

/** How Foundry pf2e sorts actions on the sheet. */
export const ActionCategory = {
  Interaction: 'interaction',
  Defensive: 'defensive',
  Offensive: 'offensive',
  Familiar: 'familiar',
} as const;
export type ActionCategory = ValueOf<typeof ActionCategory>;
const ActionCategorySchema = z.enum(ActionCategory);

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
const FrequencyPeriodSchema = z.enum(FrequencyPeriod);

/** How many times something can be used per period. */
export const Uses = Pg.smallint().positive().brand<'Uses'>();
export type Uses = z.infer<typeof Uses>;

/** "Once per round", "three times per day". */
export const Frequency = z.strictObject({ max: Uses, per: FrequencyPeriodSchema });
export type Frequency = z.infer<typeof Frequency>;

/** How many actions each glyph that counts them is; a free action or reaction can't take a range. */
export const ACTION_COUNT: Readonly<Partial<Record<ActionCost, number>>> = {
  [ActionCost.One]: 1,
  [ActionCost.Two]: 2,
  [ActionCost.Three]: 3,
};

/** The fewest actions a variable cost can run to: one to two. */
const UP_TO_MIN = 2;
/** The most actions a variable cost can run to: an activity can span two turns of three. */
export const UP_TO_MAX = 6;

/** How many actions a variable cost runs to ("[one-action] to [two-actions]", or across turns). */
const ActionCount = Pg.smallint().min(UP_TO_MIN).max(UP_TO_MAX).brand<'ActionCount'>();
type ActionCount = z.infer<typeof ActionCount>;

/** The most skills one feat or action names: every skill but Lore. */
const SKILLS_MAX = 16;

/** The skills a feat or action uses, by statistic selector (`skill:athletics`). */
export const Skills = z.array(SkillSelector).max(SKILLS_MAX).readonly().check(uniqueItems);

const UP_TO = { ...issueParams(message(RulesMessage.ActionUpTo)), path: ['upTo'] };

/** A variable cost starts at a glyph that counts actions and runs to more of them. */
function isVariableCost(cost: ActionCost | undefined, upTo: ActionCount): boolean {
  const from = cost === undefined ? undefined : ACTION_COUNT[cost];
  return from !== undefined && from < upTo;
}

/**
 * An action's `data` on the `ContentEntry` envelope. Its effects are its `rules` and description; this is how it is
 * used. A reaction always has a trigger.
 */
export const ActionData = z
  .strictObject({
    /** The glyph it costs; absent for a passive ability. */
    cost: ActionCostSchema.optional(),
    /** With a `cost` that counts actions, the most it can take: a variable cost the user picks. */
    upTo: ActionCount.optional(),
    /** The skills it uses (Climb uses Athletics). */
    skills: Skills.optional(),
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
  })
  .refine(({ cost, upTo }) => upTo === undefined || isVariableCost(cost, upTo), UP_TO);
export type ActionData = z.infer<typeof ActionData>;
