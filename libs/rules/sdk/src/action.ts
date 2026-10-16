import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { RulesMessage } from './messages';
import { Predicate } from './predicate';
import { ProficiencySchema } from './proficiency';
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
export const ActionCount = Pg.smallint().min(UP_TO_MIN).max(UP_TO_MAX).brand<'ActionCount'>();
export type ActionCount = z.infer<typeof ActionCount>;

/** The most skills one feat or action names: every skill but Lore. */
const SKILLS_MAX = 16;

/** The skills a feat or action uses, by statistic selector (`skill:athletics`). */
export const Skills = z.array(SkillSelector).max(SKILLS_MAX).readonly().check(uniqueItems);

const UP_TO = { ...issueParams(message(RulesMessage.ActionUpTo)), path: ['upTo'] };
const MINIMUM_PROFICIENCY = {
  ...issueParams(message(RulesMessage.ActionMinimumProficiency)),
  path: ['minimumProficiency'],
};

/** A variable cost starts at a glyph that counts actions and runs to more of them. */
export function isVariableCost(cost: ActionCost | undefined, upTo: ActionCount): boolean {
  const from = cost === undefined ? undefined : ACTION_COUNT[cost];
  return from !== undefined && from < upTo;
}

/** The sheet modes an action is used in: a fight, travel and scouting, or the time between adventures. */
export const ActionMode = { Encounter: 'encounter', Exploration: 'exploration', Downtime: 'downtime' } as const;
export type ActionMode = ValueOf<typeof ActionMode>;
const ActionModeSchema = z.enum(ActionMode);

/** The most modes an action lists: all of them. */
const MODES_MAX = 3;

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
    /** The wording shown for what it needs ("you have a free hand"); `requirements` is what the engine tests. */
    requirementsText: RichText.optional(),
    /** What must hold to use it, as roll options (`self:condition:prone` negated, a raised shield); absent when nothing is tested. */
    requirements: Predicate.optional(),
    /** The sheet modes it is used in; an action that lists none is an Encounter one. */
    modes: z.array(ActionModeSchema).max(MODES_MAX).check(uniqueItems).readonly().optional(),
    /** Every character has it, granted or not: the basic and skill actions. */
    universal: z.literal(true).optional(),
    /** With `skills`, the rank it takes in one of them to use it: a trained-only skill action. */
    minimumProficiency: ProficiencySchema.optional(),
    /** The wording shown; `triggerEvent` is what the engine matches. */
    trigger: RichText.optional(),
    ...triggerFields,
    frequency: Frequency.optional(),
    /** The effect using it applies to the user (Raise a Shield's Shield Raised). */
    selfEffect: ContentId.optional(),
  })
  .refine((data) => data.cost !== ActionCost.Reaction || data.trigger !== undefined, {
    ...issueParams(message(RulesMessage.ActionReactionTrigger)),
    path: ['trigger'],
  })
  .refine(
    ({ minimumProficiency, skills }) => minimumProficiency === undefined || (skills !== undefined && skills.length > 0),
    MINIMUM_PROFICIENCY,
  )
  .refine(({ cost, upTo }) => upTo === undefined || isVariableCost(cost, upTo), UP_TO)
  .refine(AUTO_APPLY_NEEDS_EVENT.check, AUTO_APPLY_NEEDS_EVENT.params);
export type ActionData = z.infer<typeof ActionData>;
