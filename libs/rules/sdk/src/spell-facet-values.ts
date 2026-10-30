import type { ValueOf } from '@pioneer/shared/kernel';

import type { ContentEntry } from './content-entry';
import type { ContentKind } from './content-kind';
import { ActionCost, AreaShape } from './rich-text';
import type { Selector } from './selector';
import { CastTimeType, SpellDurationType, SpellRangeType, SpellTimeUnit } from './spell-casting';
import type { SingleCastTime, SingleDuration, SingleRange } from './spell-casting';
import { TargetKind } from './spell-targets';
import { Trait } from './trait';
import { Feet } from './units';

export type SpellEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Spell }>;
type SpellFields = SpellEntry['data'];

/** How far a spell reaches, in the bands a player thinks in; miles are `long`. A spell with no range is `none`. */
export const RangeBand = {
  Touch: 'touch',
  UpTo30: '30-feet',
  UpTo60: '60-feet',
  UpTo120: '120-feet',
  Long: 'long',
  Planetary: 'planetary',
  Interplanar: 'interplanar',
  Unlimited: 'unlimited',
  None: 'none',
} as const;
export type RangeBand = ValueOf<typeof RangeBand>;

/** A casting time: its action glyphs, or `time` for one counted in minutes or longer. */
export const CastActions = { ...ActionCost, Time: 'time' } as const;
export type CastActions = ValueOf<typeof CastActions>;

/** What a spell targets: one target, several, allies, the caster, or nothing (an area or the caster's surroundings). */
export const TargetValue = {
  Single: 'single',
  Multiple: 'multiple',
  Allies: 'allies',
  Self: 'self',
  None: 'none',
} as const;
export type TargetValue = ValueOf<typeof TargetValue>;

/** What a spell is resisted with: an attack against AC, a save (and which), or nothing. */
export const DefenseValue = {
  Attack: 'attack',
  Fortitude: 'fortitude',
  Reflex: 'reflex',
  Will: 'will',
  None: 'none',
} as const;
export type DefenseValue = ValueOf<typeof DefenseValue>;

/** How long a spell lasts, by the largest unit it is counted in. `long` is a week or more. */
export const DurationValue = {
  Instant: 'instant',
  Round: 'round',
  Minute: 'minute',
  Hour: 'hour',
  Day: 'day',
  Long: 'long',
  Until: 'until',
  Sustained: 'sustained',
  Unlimited: 'unlimited',
  Varies: 'varies',
} as const;
export type DurationValue = ValueOf<typeof DurationValue>;

/** An area, or `none` for a spell without one. */
export const AreaValue = { ...AreaShape, None: 'none' } as const;
export type AreaValue = ValueOf<typeof AreaValue>;

const BAND_30 = Feet.parse(30);
const BAND_60 = Feet.parse(60);
const BAND_120 = Feet.parse(120);
const ATTACK = Trait.parse('attack');
const ARMOR_CLASS = 'ac';
const SAVE_PREFIX = 'save:';

/** Cast actions in order, so a variable casting time ("one to three") gives each in between. */
const ACTION_ORDER: readonly ActionCost[] = [ActionCost.One, ActionCost.Two, ActionCost.Three];
/** A duration counted in a unit: by that unit, a week or more as long. */
const TIME_DURATIONS: Readonly<Record<SpellTimeUnit, DurationValue>> = {
  [SpellTimeUnit.Round]: DurationValue.Round,
  [SpellTimeUnit.Minute]: DurationValue.Minute,
  [SpellTimeUnit.Hour]: DurationValue.Hour,
  [SpellTimeUnit.Day]: DurationValue.Day,
  [SpellTimeUnit.Week]: DurationValue.Long,
  [SpellTimeUnit.Month]: DurationValue.Long,
  [SpellTimeUnit.Year]: DurationValue.Long,
};
const SAVES: ReadonlyMap<string, DefenseValue> = new Map([
  ['fortitude', DefenseValue.Fortitude],
  ['reflex', DefenseValue.Reflex],
  ['will', DefenseValue.Will],
]);

function feetBand(feet: Feet): RangeBand {
  if (feet <= BAND_30) {
    return RangeBand.UpTo30;
  }
  if (feet <= BAND_60) {
    return RangeBand.UpTo60;
  }
  return feet <= BAND_120 ? RangeBand.UpTo120 : RangeBand.Long;
}

function singleBand(range: SingleRange): RangeBand {
  if (range.type === SpellRangeType.Feet) {
    return feetBand(range.feet);
  }
  return range.type === SpellRangeType.Miles ? RangeBand.Long : range.type;
}

/** A range's band, or each option's when the caster picks one. */
export function rangeBands({ range }: SpellFields): readonly RangeBand[] {
  if (range === undefined) {
    return [RangeBand.None];
  }
  const ranges = range.type === SpellRangeType.Either ? range.options : [range];
  return [...new Set(ranges.map((each) => singleBand(each)))];
}

function singleCastActions(time: SingleCastTime): readonly CastActions[] {
  if (time.type !== CastTimeType.Actions) {
    return [CastActions.Time];
  }
  const from = ACTION_ORDER.indexOf(time.cost);
  const to = time.upTo === undefined ? from : ACTION_ORDER.indexOf(time.upTo);
  return from === -1 ? [time.cost] : ACTION_ORDER.slice(from, to + 1);
}

/** The action counts a spell can be cast in, or `time`; each option's when the caster picks one. */
export function castActions({ time }: SpellFields): readonly CastActions[] {
  const times = time.type === CastTimeType.Either ? time.options : [time];
  return [...new Set(times.flatMap((each) => singleCastActions(each)))];
}

export function targetValues({ targets }: Pick<SpellFields, 'targets'>): readonly TargetValue[] {
  if (targets === undefined) {
    return [TargetValue.None];
  }
  const values = new Set<TargetValue>(targets.you === undefined ? [] : [TargetValue.Self]);
  for (const target of targets.any) {
    values.add(target.count === 1 && targets.plus === undefined ? TargetValue.Single : TargetValue.Multiple);
  }
  for (const target of [...targets.any, ...(targets.plus ?? [])]) {
    if (target.of === TargetKind.Ally) {
      values.add(TargetValue.Allies);
    }
  }
  return [...values];
}

/** The defence a selector names: `ac` is an attack, `save:reflex` a Reflex save. */
function defenseOf(selector: Selector): DefenseValue | undefined {
  if (selector === ARMOR_CLASS) {
    return DefenseValue.Attack;
  }
  return selector.startsWith(SAVE_PREFIX) ? SAVES.get(selector.slice(SAVE_PREFIX.length)) : undefined;
}

export function defenseValues(entry: SpellEntry): readonly DefenseValue[] {
  const { defense } = entry.data;
  const found = [
    entry.traits.includes(ATTACK) ? DefenseValue.Attack : undefined,
    defense?.save === undefined ? undefined : defenseOf(defense.save.statistic),
    defense?.against === undefined ? undefined : defenseOf(defense.against),
  ].filter((value) => value !== undefined);
  return found.length === 0 ? [DefenseValue.None] : [...new Set(found)];
}

function singleDurationValue(duration: SingleDuration): DurationValue {
  const isCounted = duration.type === SpellDurationType.Time || duration.type === SpellDurationType.Rolled;
  return isCounted ? TIME_DURATIONS[duration.unit] : duration.type;
}

/** The durations a spell has: one, or each option's when the caster picks one. */
function durationsOf({ duration }: SpellFields): readonly SingleDuration[] {
  if (duration === undefined) {
    return [];
  }
  return duration.type === SpellDurationType.Either ? duration.options : [duration];
}

export function durationValues(data: SpellFields): readonly DurationValue[] {
  const durations = durationsOf(data);
  return durations.length === 0
    ? [DurationValue.Instant]
    : [...new Set(durations.map((each) => singleDurationValue(each)))];
}

/** Sustained with no limit, or up to a time; for a choice, when any option is. */
export function isSustained(data: SpellFields): boolean {
  return durationsOf(data).some(
    (duration) =>
      duration.type === SpellDurationType.Sustained ||
      (duration.type === SpellDurationType.Time && duration.sustained === true),
  );
}
