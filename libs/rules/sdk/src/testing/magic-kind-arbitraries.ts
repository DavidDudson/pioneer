import {
  array,
  boolean,
  constant,
  constantFrom,
  integer,
  oneof,
  record,
  shuffledSubarray,
  tuple,
  uniqueArray,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DamageType } from '../damage';
import { BadgeReevaluation, EffectBadgeType, EffectCategory, EffectDurationType, EffectExpiry } from '../effect';
import { Proficiency } from '../proficiency';
import { ActionCost, AreaShape, DamageCategory, DurationUnit } from '../rich-text';
import { DamageKind, HeighteningType } from '../spell';
import {
  CastTimeType,
  SpellDurationEnd,
  SpellDurationType,
  SpellRangeType,
  SpellTimeUnit,
  TargetKind,
  TargetQualifier,
} from '../spell-casting';
import { SPELL_RANK_MAX } from '../spell-rank';
import { MagicTradition } from '../spellcasting-tradition';
import { keyPathText, saveSelectorText, skillSelectorText } from './arbitraries';
import { LIST_MAX, positive, slugText, smallint, withOptional } from './json-arbitraries';
import { damageFormulaText, richTextJson } from './rich-text-arbitraries';

const spellRank: Arbitrary<number> = integer({ min: 1, max: SPELL_RANK_MAX });

const actionCost: Arbitrary<string> = constantFrom(...Object.values(ActionCost));
const spellTimeUnit: Arbitrary<string> = constantFrom(...Object.values(SpellTimeUnit));
const AREA_SHAPES_BUT_LINE = Object.values(AreaShape).filter((shape) => shape !== AreaShape.Line);
const areaShapeButLine: Arbitrary<string> = constantFrom(...AREA_SHAPES_BUT_LINE);
const targetKind: Arbitrary<string> = constantFrom(...Object.values(TargetKind));
const targetQualifiers: Arbitrary<string[]> = shuffledSubarray(Object.values(TargetQualifier));
const durationEnd: Arbitrary<string> = constantFrom(...Object.values(SpellDurationEnd));
const damageType: Arbitrary<string> = constantFrom(...Object.values(DamageType));
const damageCategory: Arbitrary<string> = constantFrom(...Object.values(DamageCategory));
const damageKinds: Arbitrary<string[]> = shuffledSubarray(Object.values(DamageKind), { minLength: 1 });
const traditions: Arbitrary<string[]> = shuffledSubarray(Object.values(MagicTradition));
const proficiency: Arbitrary<string> = constantFrom(...Object.values(Proficiency));
const traits: Arbitrary<string[]> = uniqueArray(slugText, { maxLength: LIST_MAX });

/** A range from fewer actions to more. */
const actionRange: Arbitrary<object> = constantFrom(
  { type: CastTimeType.Actions, cost: ActionCost.One, upTo: ActionCost.Two },
  { type: CastTimeType.Actions, cost: ActionCost.One, upTo: ActionCost.Three },
  { type: CastTimeType.Actions, cost: ActionCost.Two, upTo: ActionCost.Three },
);
const spellTime = { count: positive, unit: spellTimeUnit };
const castTime: Arbitrary<object> = oneof(
  record({ type: constant(CastTimeType.Actions), cost: actionCost }),
  actionRange,
  record({ type: constant(CastTimeType.Time), ...spellTime }),
);

const range: Arbitrary<object> = oneof(
  record({ type: constant(SpellRangeType.Feet), feet: smallint }),
  constant({ type: SpellRangeType.Touch }),
  constant({ type: SpellRangeType.Planetary }),
  constant({ type: SpellRangeType.Unlimited }),
);

const line: Arbitrary<object> = record({ shape: constant(AreaShape.Line), size: smallint });
/** Only a line has a width. */
const area: Arbitrary<object> = oneof(
  record({ shape: areaShapeButLine, size: smallint }),
  withOptional(line, { width: smallint }),
);

const target: Arbitrary<object> = withOptional(record({ count: positive, of: targetKind }), {
  upTo: boolean(),
  qualifiers: targetQualifiers,
  traits,
});
const anyTarget: Arbitrary<object> = record({ any: array(target, { minLength: 1, maxLength: LIST_MAX }) });
const targets: Arbitrary<object> = withOptional(anyTarget, { includesYou: boolean() });

const timedDuration: Arbitrary<object> = record({ type: constant(SpellDurationType.Time), ...spellTime });
const duration: Arbitrary<object> = oneof(
  withOptional(timedDuration, { sustained: boolean() }),
  constant({ type: SpellDurationType.Sustained }),
  record({ type: constant(SpellDurationType.Until), until: durationEnd }),
  constant({ type: SpellDurationType.Unlimited }),
);

const save: Arbitrary<object> = record({ statistic: saveSelectorText, basic: boolean() });
/** A save, a statistic it is against, or both. */
const defense: Arbitrary<object> = oneof(
  record({ save }),
  record({ against: keyPathText }),
  record({ save, against: keyPathText }),
);

/** Casting fields at `rank`, with every optional one sometimes present. */
function castingJson(rank: number): Arbitrary<object> {
  return withOptional(record({ rank: constant(rank), time: castTime }), {
    range,
    area,
    targets,
    duration,
    defense,
    cost: richTextJson,
    requirements: richTextJson,
  });
}

function damagePart(key: string): Arbitrary<object> {
  const required = record({ key: constant(key), formula: damageFormulaText, damageType, kinds: damageKinds });
  return withOptional(required, { category: damageCategory });
}

const damageKeys: Arbitrary<string[]> = uniqueArray(slugText, { maxLength: LIST_MAX });

function damageParts(keys: readonly string[]): Arbitrary<object[]> {
  return tuple(...keys.map((key) => damagePart(key)));
}

const anyDamageParts: Arbitrary<object[]> = damageKeys.chain((keys) => damageParts(keys));

function damageIncrease(key: string): Arbitrary<object> {
  return record({ key: constant(key), formula: damageFormulaText });
}

/** Interval heightening adding to some of `keys`. */
function intervalHeightening(keys: readonly string[]): Arbitrary<object> {
  const increases = shuffledSubarray([...keys]).chain((picked) => tuple(...picked.map((key) => damageIncrease(key))));
  const required = record({
    type: constant(HeighteningType.Interval),
    interval: integer({ min: 1, max: SPELL_RANK_MAX - 1 }),
    damage: increases,
  });
  return withOptional(required, { area: smallint });
}

function heightenedRank(rank: number): Arbitrary<object> {
  return withOptional(record({ rank: constant(rank) }), { damage: anyDamageParts, range, area, targets, duration });
}

/** Fixed heightening at distinct ranks above `rank`, which must be below 10th. */
function fixedHeightening(rank: number): Arbitrary<object> {
  const above = Array.from({ length: SPELL_RANK_MAX - rank }, (_unused, index) => rank + index + 1);
  const picked = shuffledSubarray(above, { minLength: 1, maxLength: above.length });
  const ranks = picked.chain((chosen) => tuple(...chosen.map((at) => heightenedRank(at))));
  return record({ type: constant(HeighteningType.Fixed), ranks });
}

function heightening(rank: number, keys: readonly string[]): Arbitrary<object> {
  return rank < SPELL_RANK_MAX ? oneof(intervalHeightening(keys), fixedHeightening(rank)) : intervalHeightening(keys);
}

function spellDataAt(rank: number, keys: readonly string[]): Arbitrary<object> {
  const own = withOptional(record({ traditions, damage: damageParts(keys) }), {
    heightening: heightening(rank, keys),
    counteraction: boolean(),
  });
  return tuple(castingJson(rank), own).map(([casting, fields]) => Object.assign(casting, fields));
}

/** A spell's `data`: heightening refers only to its damage parts and ranks above its own. */
export const spellData: Arbitrary<object> = tuple(spellRank, damageKeys).chain(([rank, keys]) =>
  spellDataAt(rank, keys),
);

const ritualCheck: Arbitrary<object> = withOptional(
  record({ skills: uniqueArray(skillSelectorText, { minLength: 1, maxLength: LIST_MAX }) }),
  { proficiency },
);
const secondaryCasting: Arbitrary<object> = record({
  checks: array(ritualCheck, { maxLength: LIST_MAX }),
  casters: smallint,
});

function ritualDataAt(rank: number): Arbitrary<object> {
  const checks = record({ primary: ritualCheck, secondary: secondaryCasting });
  return tuple(castingJson(rank), checks).map(([casting, fields]) => Object.assign(casting, fields));
}

export const ritualData: Arbitrary<object> = spellRank.chain((rank) => ritualDataAt(rank));

export const spellcastingTraditionData: Arbitrary<object> = record({ skill: skillSelectorText });

const BADGE_MIN = -10;
const BADGE_MAX = 10;
const BADGE_BOUNDS = 3;
const badgeNumber: Arbitrary<number> = integer({ min: BADGE_MIN, max: BADGE_MAX });
const badgeLabels: Arbitrary<string[]> = array(constant('Stage'), { maxLength: LIST_MAX });

function counterBadgeOf([min = 0, value = 0, max = 0]: readonly number[]): Arbitrary<object> {
  return withOptional(record({ type: constant(EffectBadgeType.Counter), value: constant(value) }), {
    min: constant(min),
    max: constant(max),
    labels: badgeLabels,
    loop: boolean(),
  });
}

/** A counter starting between its bounds. */
const counterBadge: Arbitrary<object> = array(badgeNumber, { minLength: BADGE_BOUNDS, maxLength: BADGE_BOUNDS })
  .map((numbers) => numbers.toSorted((left, right) => left - right))
  .chain((bounds) => counterBadgeOf(bounds));
const formulaBadge: Arbitrary<object> = withOptional(
  record({ type: constant(EffectBadgeType.Formula), formula: damageFormulaText }),
  { reevaluate: constantFrom(...Object.values(BadgeReevaluation)) },
);

const timedEffect: Arbitrary<object> = record({
  type: constant(EffectDurationType.Time),
  count: positive,
  unit: constantFrom(...Object.values(DurationUnit)),
});
const effectExpiry: Arbitrary<string> = constantFrom(...Object.values(EffectExpiry));
const effectCategory: Arbitrary<string> = constantFrom(...Object.values(EffectCategory));
const effectDuration: Arbitrary<object> = oneof(
  withOptional(timedEffect, { expiry: effectExpiry, sustained: boolean() }),
  constant({ type: EffectDurationType.Encounter }),
  constant({ type: EffectDurationType.Unlimited }),
);

export const effectData: Arbitrary<object> = withOptional(
  record({ category: effectCategory, duration: effectDuration }),
  { badge: oneof(counterBadge, formulaBadge) },
);
