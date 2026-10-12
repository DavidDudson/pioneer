import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ACTION_COUNT } from './action';
import { RulesMessage } from './messages';
import { ActionCost, ActionCostSchema, AreaShape, AreaShapeSchema, RichText } from './rich-text';
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
/** How many of a unit a casting time or duration is. */
const SpellTimeCount = Pg.smallint().positive().brand<'SpellTimeCount'>();

const SpellTime = { count: SpellTimeCount, unit: SpellTimeUnitSchema };

/** A casting time in action glyphs, or in time for longer castings and rituals. */
export const CastTimeType = { Actions: 'actions', Time: 'time' } as const;
export type CastTimeType = ValueOf<typeof CastTimeType>;

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
export const TargetKind = {
  Creature: 'creature',
  Object: 'object',
  Ally: 'ally',
  Enemy: 'enemy',
  Corpse: 'corpse',
  Weapon: 'weapon',
  Item: 'item',
  SpellEffect: 'spell-effect',
  /** The caster's animal companion, familiar or eidolon ("1 willing creature that is your companion"). */
  Companion: 'companion',
  AnimalCompanion: 'animal-companion',
  Familiar: 'familiar',
  Eidolon: 'eidolon',
} as const;
export type TargetKind = ValueOf<typeof TargetKind>;

/** Words that narrow a target: "1 willing creature", "1 unattended magic item", "1 dead creature". */
export const TargetQualifier = {
  Willing: 'willing',
  Living: 'living',
  Dead: 'dead',
  Dying: 'dying',
  Sleeping: 'sleeping',
  Falling: 'falling',
  Flying: 'flying',
  Corporeal: 'corporeal',
  Unattended: 'unattended',
  Magical: 'magical',
} as const;
export type TargetQualifier = ValueOf<typeof TargetQualifier>;

/** A count that is no number: "any number of creatures", or every one there is ("all creatures in range"). */
export const TargetCountWord = { Any: 'any', All: 'all' } as const;
export type TargetCountWord = ValueOf<typeof TargetCountWord>;

/** Where `all` targets are: in the spell's area ("enemies in the area") or within its range. */
export const TargetWithin = { Area: 'area', Range: 'range' } as const;
export type TargetWithin = ValueOf<typeof TargetWithin>;

/** The caster as a target: as well as the others ("you and up to 4 allies") or instead of them ("you or 1 ally"). */
export const TargetYou = { And: 'and', Or: 'or' } as const;
export type TargetYou = ValueOf<typeof TargetYou>;

/** How many of a kind a spell targets. */
const TargetCount = z.union([Pg.smallint().positive().brand<'TargetCount'>(), z.enum(TargetCountWord)]);

const TARGET_QUALIFIERS = Object.keys(TargetQualifier).length;
const TARGET_TRAITS_MAX = 4;
const TARGETS_MAX = 8;

const TARGET_UP_TO = { ...issueParams(message(RulesMessage.SpellTargetUpTo)), path: ['upTo'] };
const TARGET_WITHIN = { ...issueParams(message(RulesMessage.SpellTargetWithin)), path: ['within'] };

/**
 * "1 creature", "up to 5 creatures", "any number of creatures", "enemies in the area", "1 willing living creature",
 * "1 creature with the undead trait", "the triggering creature".
 */
const SpellTarget = z
  .strictObject({
    count: TargetCount,
    /** Up to `count`, rather than exactly. */
    upTo: z.boolean().optional(),
    /** Where `all` of them are. */
    within: z.enum(TargetWithin).optional(),
    of: z.enum(TargetKind),
    qualifiers: z.array(z.enum(TargetQualifier)).max(TARGET_QUALIFIERS).readonly().check(uniqueItems).optional(),
    /** Traits each target must have. */
    traits: z.array(Trait).max(TARGET_TRAITS_MAX).readonly().check(uniqueItems).optional(),
    /** The one that triggered the spell ("the triggering creature"). */
    triggering: z.boolean().optional(),
  })
  .refine(({ count, upTo }) => upTo === undefined || typeof count === 'number', TARGET_UP_TO)
  .refine(({ count, within }) => (within === undefined) === (count !== TargetCountWord.All), TARGET_WITHIN);

const Targets = z.array(SpellTarget).min(1).max(TARGETS_MAX).readonly();

/**
 * A spell's targets: any one of `any` ("1 willing living creature or 1 undead"), each of `plus` as well ("1 ally and 1
 * enemy"), and the caster with `you`.
 */
export const SpellTargets = z.strictObject({
  any: Targets,
  plus: Targets.optional(),
  you: z.enum(TargetYou).optional(),
});

export const SpellDurationType = {
  Time: 'time',
  Sustained: 'sustained',
  Until: 'until',
  Unlimited: 'unlimited',
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

/**
 * "1 minute", "sustained up to 1 minute" (`time` with `sustained`), "sustained" with no limit, "until the end of
 * your turn", "until the end of the target's next turn", "unlimited". An instant spell has none.
 */
export const SpellDuration = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(SpellDurationType.Time), ...SpellTime, sustained: z.boolean().optional() }),
  z.strictObject({ type: z.literal(SpellDurationType.Sustained) }),
  UntilDuration,
  z.strictObject({ type: z.literal(SpellDurationType.Unlimited) }),
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
const SpellDefense = z
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
