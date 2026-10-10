import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Uses } from './action';
import { RulesMessage } from './messages';
import { ActionCost, ActionCostSchema, AreaShape, AreaShapeSchema, DurationCount, RichText } from './rich-text';
import { SaveSelector, Selector } from './selector';
import { SpellRank } from './spell-rank';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';
import { Feet } from './units';

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
const SpellTime = { count: DurationCount, unit: SpellTimeUnitSchema };

/** A casting time in action glyphs, or in time for longer castings and rituals. */
export const CastTimeType = { Actions: 'actions', Time: 'time' } as const;
export type CastTimeType = ValueOf<typeof CastTimeType>;

/** How many actions each glyph that counts them is; a free action or reaction can't take a range. */
const ACTION_COUNT: Readonly<Partial<Record<ActionCost, number>>> = {
  [ActionCost.One]: 1,
  [ActionCost.Two]: 2,
  [ActionCost.Three]: 3,
};

/** The most actions a variable casting time can take. */
const UpToCost = z.enum([ActionCost.Two, ActionCost.Three]);

/** `fewest` counts actions and is fewer than `most`. */
function isFewerActions(fewest: ActionCost, most: ActionCost): boolean {
  const from = ACTION_COUNT[fewest];
  const to = ACTION_COUNT[most];
  return from !== undefined && to !== undefined && from < to;
}

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

const CastTime = z.discriminatedUnion('type', [
  ActionsCastTime,
  z.strictObject({ type: z.literal(CastTimeType.Time), ...SpellTime }),
]);

export const SpellRangeType = {
  Feet: 'feet',
  Touch: 'touch',
  Planetary: 'planetary',
  Unlimited: 'unlimited',
} as const;
export type SpellRangeType = ValueOf<typeof SpellRangeType>;

/** "500 feet", "touch", "planetary", "unlimited". */
export const SpellRange = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(SpellRangeType.Feet), feet: Feet }),
  z.strictObject({ type: z.literal(SpellRangeType.Touch) }),
  z.strictObject({ type: z.literal(SpellRangeType.Planetary) }),
  z.strictObject({ type: z.literal(SpellRangeType.Unlimited) }),
]);

/** "20-foot burst"; a line wider than 5 feet also has a `width` ("60-foot line, 10 feet wide"). */
export const SpellArea = z
  .strictObject({ shape: AreaShapeSchema, size: Feet, width: Feet.optional() })
  .refine((area) => area.width === undefined || area.shape === AreaShape.Line, {
    ...issueParams(message(RulesMessage.RichTextWidthOnLine)),
    path: ['width'],
  });

/** What a spell can target. "1 creature or object" is two targets, one of each. */
export const TargetKind = { Creature: 'creature', Object: 'object', Ally: 'ally', Corpse: 'corpse' } as const;
export type TargetKind = ValueOf<typeof TargetKind>;

/** Words that narrow a target: "1 willing creature", "1 living creature". */
export const TargetQualifier = { Willing: 'willing', Living: 'living' } as const;
export type TargetQualifier = ValueOf<typeof TargetQualifier>;

const TARGET_QUALIFIERS = Object.keys(TargetQualifier).length;
const TARGET_TRAITS_MAX = 4;
const TARGETS_MAX = 4;

/** "1 creature", "up to 5 creatures", "1 willing living creature", "1 creature with the undead trait". */
const SpellTarget = z.strictObject({
  count: Uses,
  /** Up to `count`, rather than exactly. */
  upTo: z.boolean().optional(),
  of: z.enum(TargetKind),
  qualifiers: z.array(z.enum(TargetQualifier)).max(TARGET_QUALIFIERS).readonly().check(uniqueItems).optional(),
  /** Traits each target must have. */
  traits: z.array(Trait).max(TARGET_TRAITS_MAX).readonly().check(uniqueItems).optional(),
});

/** A spell's targets: any one of `any` ("1 willing living creature or 1 undead"), and the caster with `includesYou`. */
export const SpellTargets = z.strictObject({
  any: z.array(SpellTarget).min(1).max(TARGETS_MAX).readonly(),
  /** "You and up to 4 allies". */
  includesYou: z.boolean().optional(),
});

export const SpellDurationType = {
  Time: 'time',
  Sustained: 'sustained',
  Until: 'until',
  Unlimited: 'unlimited',
} as const;
export type SpellDurationType = ValueOf<typeof SpellDurationType>;

/** The moment an `until` duration ends. */
export const SpellDurationEnd = {
  NextTurnStart: 'next-turn-start',
  NextTurnEnd: 'next-turn-end',
  DailyPreparations: 'daily-preparations',
} as const;
export type SpellDurationEnd = ValueOf<typeof SpellDurationEnd>;

/**
 * "1 minute", "sustained up to 1 minute" (`time` with `sustained`), "sustained" with no limit, "until the start of
 * your next turn", "unlimited". An instant spell has none.
 */
export const SpellDuration = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(SpellDurationType.Time), ...SpellTime, sustained: z.boolean().optional() }),
  z.strictObject({ type: z.literal(SpellDurationType.Sustained) }),
  z.strictObject({ type: z.literal(SpellDurationType.Until), until: z.enum(SpellDurationEnd) }),
  z.strictObject({ type: z.literal(SpellDurationType.Unlimited) }),
]);

/** The save a spell asks for ("basic Reflex"). */
const SpellSave = z.strictObject({ statistic: SaveSelector, basic: z.boolean() });

/**
 * What a spell is resisted with: a `save`, the statistic whose DC its attack or check is `against` (`ac` for a spell
 * attack), or both, as Foundry pf2e stores them.
 */
const SpellDefense = z
  .strictObject({ save: SpellSave.optional(), against: Selector.optional() })
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
