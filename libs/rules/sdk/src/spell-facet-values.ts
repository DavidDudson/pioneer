import type { ValueOf } from '@pioneer/shared/kernel';

import type { ContentEntry } from './content-entry';
import type { ContentKind } from './content-kind';
import { ActionCost, AreaShape } from './rich-text';
import type { Selector } from './selector';
import { CastTimeType, SpellDurationType, SpellRangeType, SpellTimeUnit, TargetKind } from './spell-casting';
import { Trait } from './trait';
import { Feet } from './units';

export type SpellEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Spell }>;
type SpellFields = SpellEntry['data'];

/** How far a spell reaches, in the bands a player thinks in. A spell with no range is `none`. */
export const RangeBand = {
  Touch: 'touch',
  UpTo30: '30-feet',
  UpTo60: '60-feet',
  UpTo120: '120-feet',
  Long: 'long',
  Planetary: 'planetary',
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

export function rangeBand({ range }: SpellFields): RangeBand {
  if (range === undefined) {
    return RangeBand.None;
  }
  if (range.type !== SpellRangeType.Feet) {
    return range.type;
  }
  if (range.feet <= BAND_30) {
    return RangeBand.UpTo30;
  }
  if (range.feet <= BAND_60) {
    return RangeBand.UpTo60;
  }
  return range.feet <= BAND_120 ? RangeBand.UpTo120 : RangeBand.Long;
}

export function castActions({ time }: SpellFields): readonly CastActions[] {
  if (time.type !== CastTimeType.Actions) {
    return [CastActions.Time];
  }
  const from = ACTION_ORDER.indexOf(time.cost);
  const to = time.upTo === undefined ? from : ACTION_ORDER.indexOf(time.upTo);
  return from === -1 ? [time.cost] : ACTION_ORDER.slice(from, to + 1);
}

export function targetValues({ targets }: SpellFields): readonly TargetValue[] {
  if (targets === undefined) {
    return [TargetValue.None];
  }
  const values = new Set<TargetValue>(targets.includesYou === true ? [TargetValue.Self] : []);
  for (const target of targets.any) {
    values.add(target.count > 1 ? TargetValue.Multiple : TargetValue.Single);
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

export function durationValue({ duration }: SpellFields): DurationValue {
  if (duration === undefined) {
    return DurationValue.Instant;
  }
  if (duration.type !== SpellDurationType.Time) {
    return duration.type;
  }
  return TIME_DURATIONS[duration.unit];
}

export function isSustained({ duration }: SpellFields): boolean {
  return (
    duration?.type === SpellDurationType.Sustained ||
    (duration?.type === SpellDurationType.Time && duration.sustained === true)
  );
}
