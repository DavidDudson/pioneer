import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ACTION_COUNT } from './action';
import { RulesMessage } from './messages';
import { ActionCost, ActionCostSchema, AreaShape, AreaShapeSchema, RichText } from './rich-text';
import { SaveSelector, Selector } from './selector';
import { SpellRank } from './spell-rank';
import { SpellTargets } from './spell-targets';
import { Feet, Miles } from './units';
import { DieSize } from './weapon';

/** The units a casting time or a duration is counted in, from rounds to years ("3 days", "1 year"). */
export const SpellTimeUnit = {
  Round: 'round',
  Minute: 'minute',
  Hour: 'hour',
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Year: 'year',
} as const;
export type SpellTimeUnit = ValueOf<typeof SpellTimeUnit>;
const SpellTimeUnitSchema = z.enum(SpellTimeUnit);

/** How long "3 days" is: a count of a unit. */
/** How many of a unit a casting time or duration is. */
const SpellTimeCount = Pg.smallint().positive().brand<'SpellTimeCount'>();

const SpellTime = { count: SpellTimeCount, unit: SpellTimeUnitSchema };

/** A casting time in action glyphs, or in time for longer castings and rituals. */
export const CastTimeType = { Actions: 'actions', Time: 'time', Either: 'either' } as const;
export type CastTimeType = ValueOf<typeof CastTimeType>;

/** The most actions a variable casting time can take. */
const UpToCost = z.enum([ActionCost.Two, ActionCost.Three]);

/** `fewest` counts actions and is fewer than `most`. */
function isFewerActions(fewest: ActionCost, most: ActionCost): boolean {
  const from = ACTION_COUNT[fewest];
  const to = ACTION_COUNT[most];
  return from !== undefined && to !== undefined && from < to;
}

/** A casting time offers two ways at most: actions or time. */
const CAST_OPTIONS_MAX = 2;

/**
 * "[two-actions]", or with `upTo` a range the caster picks from ("[one-action] to [three-actions]", Heal); "10
 * minutes".
 */
const CAST_UP_TO = { ...issueParams(message(RulesMessage.SpellCastUpTo)), path: ['upTo'] };

const ActionsCastTime = z
  .strictObject({
    type: z.literal(CastTimeType.Actions),
    cost: ActionCostSchema,
    upTo: UpToCost.optional(),
  })
  .refine(({ cost, upTo }) => upTo === undefined || isFewerActions(cost, upTo), CAST_UP_TO);

const TimedCastTime = z.strictObject({ type: z.literal(CastTimeType.Time), ...SpellTime });

/** One way of casting: in actions or in time. */
export const SingleCastTime = z.discriminatedUnion('type', [ActionsCastTime, TimedCastTime]);
export type SingleCastTime = z.infer<typeof SingleCastTime>;

/** A casting time, or one of several the caster picks from ("[two-actions] or 2 rounds", Psychic Outburst). */
export const CastTime = z.discriminatedUnion('type', [
  ActionsCastTime,
  TimedCastTime,
  z.strictObject({
    type: z.literal(CastTimeType.Either),
    options: z.array(SingleCastTime).min(2).max(CAST_OPTIONS_MAX).readonly(),
  }),
]);

export const SpellRangeType = {
  Feet: 'feet',
  Miles: 'miles',
  Touch: 'touch',
  Planetary: 'planetary',
  Interplanar: 'interplanar',
  Unlimited: 'unlimited',
  /** One of several the caster picks from ("touch or 30 feet"). */
  Either: 'either',
} as const;
export type SpellRangeType = ValueOf<typeof SpellRangeType>;

/** The most ranges or durations a caster picks from. */
const OPTIONS_MAX = 3;

/** "500 feet", "100 miles", "touch", "planetary", "interplanar", "unlimited". */
const SingleRange = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(SpellRangeType.Feet), feet: Feet }),
  z.strictObject({ type: z.literal(SpellRangeType.Miles), miles: Miles }),
  z.strictObject({ type: z.literal(SpellRangeType.Touch) }),
  z.strictObject({ type: z.literal(SpellRangeType.Planetary) }),
  z.strictObject({ type: z.literal(SpellRangeType.Interplanar) }),
  z.strictObject({ type: z.literal(SpellRangeType.Unlimited) }),
]);

export type SingleRange = z.infer<typeof SingleRange>;

/** A range, or one of several the caster picks from ("touch or 30 feet"). */
export const SpellRange = z.discriminatedUnion('type', [
  SingleRange,
  z.strictObject({
    type: z.literal(SpellRangeType.Either),
    options: z.array(SingleRange).min(2).max(OPTIONS_MAX).readonly(),
  }),
]);

/**
 * "20-foot burst"; a line wider than 5 feet also has a `width` ("60-foot line, 10 feet wide"). `details` narrows the
 * area as printed ("all squares in a 20-foot-radius burst that contain plants").
 */
export const SpellArea = z
  .strictObject({ shape: AreaShapeSchema, size: Feet, width: Feet.optional(), details: RichText.optional() })
  .refine((area) => area.width === undefined || area.shape === AreaShape.Line, {
    ...issueParams(message(RulesMessage.RichTextWidthOnLine)),
    path: ['width'],
  });

export const SpellDurationType = {
  Time: 'time',
  /** Dice of a unit ("4d12 hours"). */
  Rolled: 'rolled',
  Sustained: 'sustained',
  Until: 'until',
  Unlimited: 'unlimited',
  /** The text says how long, often by degree of success ("varies", "see text", "1 or more rounds"). */
  Varies: 'varies',
  /** One of several the caster picks from ("10 minutes or 8 hours"). */
  Either: 'either',
} as const;
export type SpellDurationType = ValueOf<typeof SpellDurationType>;

/** The moment an `until` duration ends: the end of this turn, the start or end of the next, or daily preparations. */
export const SpellDurationEnd = {
  TurnEnd: 'turn-end',
  NextTurnStart: 'next-turn-start',
  NextTurnEnd: 'next-turn-end',
  DailyPreparations: 'daily-preparations',
} as const;
export type SpellDurationEnd = ValueOf<typeof SpellDurationEnd>;

/** Whose turn a turn-relative `until` counts: the caster's, or the target's ("the target's next turn"). */
export const TurnOwner = { Caster: 'caster', Target: 'target' } as const;
export type TurnOwner = ValueOf<typeof TurnOwner>;

const UntilDuration = z
  .strictObject({
    type: z.literal(SpellDurationType.Until),
    until: z.enum(SpellDurationEnd),
    /** The caster's when absent. */
    of: z.enum(TurnOwner).optional(),
  })
  .refine((duration) => duration.of === undefined || duration.until !== SpellDurationEnd.DailyPreparations, {
    ...issueParams(message(RulesMessage.SpellDurationOwner)),
    path: ['of'],
  });

const DURATION_UP_TO = { ...issueParams(message(RulesMessage.SpellDurationUpTo)), path: ['upTo'] };

/** "1 minute", "up to 10 minutes" (`upTo`, ended early at will), "sustained up to 1 minute" (`sustained`). */
const TimeDuration = z
  .strictObject({
    type: z.literal(SpellDurationType.Time),
    ...SpellTime,
    upTo: z.boolean().optional(),
    sustained: z.boolean().optional(),
  })
  .refine(({ upTo, sustained }) => upTo === undefined || sustained === undefined, DURATION_UP_TO);

/** How many dice a rolled duration is. */
const DurationDice = Pg.smallint().positive().brand<'DurationDice'>();

/**
 * A duration that is no choice: a time, rolled dice of a unit, "sustained" with no limit, "until the end of your turn",
 * "until the end of the target's next turn", "unlimited", or one the text describes (`varies`).
 */
const SingleDuration = z.discriminatedUnion('type', [
  TimeDuration,
  z.strictObject({
    type: z.literal(SpellDurationType.Rolled),
    dice: DurationDice,
    die: z.enum(DieSize),
    unit: SpellTimeUnitSchema,
  }),
  z.strictObject({ type: z.literal(SpellDurationType.Sustained) }),
  UntilDuration,
  z.strictObject({ type: z.literal(SpellDurationType.Unlimited) }),
  z.strictObject({ type: z.literal(SpellDurationType.Varies) }),
]);

export type SingleDuration = z.infer<typeof SingleDuration>;

/**
 * A duration, or one of several the caster picks from ("10 minutes or 8 hours", "1 round or sustained up to 1
 * minute"). An instant spell has none.
 */
export const SpellDuration = z.discriminatedUnion('type', [
  SingleDuration,
  z.strictObject({
    type: z.literal(SpellDurationType.Either),
    options: z.array(SingleDuration).min(2).max(OPTIONS_MAX).readonly(),
  }),
]);

/** The save a spell asks for ("basic Reflex"). */
const SpellSave = z.strictObject({ statistic: SaveSelector, basic: z.boolean() });

const ARMOR_CLASS = 'ac';
const SAVE_PREFIX = 'save:';

/** A passive defence: AC or a save's DC (Foundry pf2e's `ac` and `<save>-dc`). */
const PassiveDefense = Selector.refine(
  (selector) => selector === ARMOR_CLASS || selector.startsWith(SAVE_PREFIX),
  issueParams(message(RulesMessage.SpellAgainst)),
);

/**
 * What a spell is resisted with: a `save`, the passive defence it is `against`, or both, as Foundry pf2e stores
 * them. A spell attack is marked by the `attack` trait, not here.
 */
export const SpellDefense = z
  .strictObject({ save: SpellSave.optional(), against: PassiveDefense.optional() })
  .refine((defense) => defense.save !== undefined || defense.against !== undefined, {
    ...issueParams(message(RulesMessage.SpellDefenseEmpty)),
  });

/** What casting takes and reaches; a spell and a ritual share them. */
export const castingFields = {
  rank: SpellRank,
  time: CastTime,
  range: SpellRange.optional(),
  area: SpellArea.optional(),
  targets: SpellTargets.optional(),
  duration: SpellDuration.optional(),
  defense: SpellDefense.optional(),
  /** Material costs, as printed ("rare incense worth 20 gp × the spell rank"). */
  cost: RichText.optional(),
  requirements: RichText.optional(),
};
