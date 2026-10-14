import type { SpellCast } from '@pioneer/rules/engine';
import {
  DamageKind,
  SpellDurationEnd,
  SpellDurationType,
  SpellRangeType,
  TargetCountWord,
  TurnOwner,
} from '@pioneer/rules/sdk';
import type { SpellData, SpellTimeUnit } from '@pioneer/rules/sdk';

import { DAMAGE_CATEGORY_MESSAGES, DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import type { SpellEffectLine } from './spell-detail-line';
import { SPELL_TIME_UNIT_MESSAGES, SpellListMessage, TARGET_KIND_MESSAGES } from './spell-list-messages';

/** Translates a message key with its parameters, as the sheet's Transloco does. */
export type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

type Range = NonNullable<SpellData['range']>;
type SingleRange = Exclude<Range, { readonly type: typeof SpellRangeType.Either }>;
type Duration = NonNullable<SpellData['duration']>;
type SingleDuration = Exclude<Duration, { readonly type: typeof SpellDurationType.Either }>;
type TimeDuration = Extract<SingleDuration, { readonly type: typeof SpellDurationType.Time }>;
type Targets = NonNullable<SpellData['targets']>;
type Target = Targets['any'][number];

const NONE = 'none';
const YES = 'yes';
const NO = 'no';
const SEPARATOR = ' ';

const UNTIL_KEYS: Readonly<Record<SpellDurationEnd, string>> = {
  [SpellDurationEnd.TurnEnd]: 'turnEnd',
  [SpellDurationEnd.NextTurnStart]: 'nextTurnStart',
  [SpellDurationEnd.NextTurnEnd]: 'nextTurnEnd',
  [SpellDurationEnd.DailyPreparations]: 'dailyPreparations',
};

function joined(translate: Translate, parts: readonly string[]): string {
  return parts.join(` ${translate(SpellListMessage.Or)} `);
}

/** The ranges that carry no number. */
const FIXED_RANGE_MESSAGES = {
  [SpellRangeType.Touch]: SpellListMessage.RangeTouch,
  [SpellRangeType.Planetary]: SpellListMessage.RangePlanetary,
  [SpellRangeType.Interplanar]: SpellListMessage.RangeInterplanar,
  [SpellRangeType.Unlimited]: SpellListMessage.RangeUnlimited,
} as const;

function singleRange(range: SingleRange, translate: Translate): string {
  if (range.type === SpellRangeType.Feet) {
    return translate(SpellListMessage.RangeFeet, { feet: range.feet });
  }
  if (range.type === SpellRangeType.Miles) {
    return translate(SpellListMessage.RangeMiles, { miles: range.miles });
  }
  return translate(FIXED_RANGE_MESSAGES[range.type]);
}

/** "30 feet", "touch or 30 feet"; undefined when the spell has no range. */
export function rangeText(range: SpellData['range'], translate: Translate): string | undefined {
  if (range === undefined) {
    return undefined;
  }
  return range.type === SpellRangeType.Either
    ? joined(
        translate,
        range.options.map((option) => singleRange(option, translate)),
      )
    : singleRange(range, translate);
}

/** "20-foot burst", "60-foot line, 10 feet wide"; undefined when the spell has no area. */
export function areaText(area: SpellData['area'], translate: Translate): string | undefined {
  return area === undefined
    ? undefined
    : translate(SpellListMessage.Area, { size: area.size, shape: area.shape, width: area.width ?? NONE });
}

/** "1", "up to 5", "any number of", "all". */
function countText(target: Target, translate: Translate): string {
  if (target.count === TargetCountWord.Any) {
    return translate(SpellListMessage.TargetAny);
  }
  if (target.count === TargetCountWord.All) {
    return translate(SpellListMessage.TargetAll);
  }
  const key = target.upTo === true ? SpellListMessage.TargetUpTo : SpellListMessage.TargetNumber;
  return translate(key, { number: target.count });
}

function targetText(target: Target, translate: Translate): string {
  const kindCount = typeof target.count === 'number' ? target.count : 2;
  const kind = translate(TARGET_KIND_MESSAGES[target.of], { count: kindCount });
  if (target.triggering === true) {
    return translate(SpellListMessage.TargetTriggering, { kind });
  }
  const count = countText(target, translate);
  const qualifiers = (target.qualifiers ?? []).map((qualifier) =>
    translate(SpellListMessage.TargetQualifier, { qualifier }),
  );
  const traits = (target.traits ?? []).map((trait) => translate(SpellListMessage.TargetTrait, { trait }));
  const within =
    target.within === undefined ? [] : [translate(SpellListMessage.TargetWithin, { within: target.within })];
  return [count, ...qualifiers, kind, ...traits, ...within].join(SEPARATOR);
}

function targetList(targets: readonly Target[], translate: Translate): string {
  return joined(
    translate,
    targets.map((target) => targetText(target, translate)),
  );
}

/** "1 creature", "you or 1 ally", "1 ally and 1 enemy"; undefined when the spell has no targets. */
export function targetsText(targets: SpellData['targets'], translate: Translate): string | undefined {
  if (targets === undefined) {
    return undefined;
  }
  const any = targetList(targets.any, translate);
  const plus = targets.plus === undefined ? undefined : targetList(targets.plus, translate);
  const together = plus === undefined ? any : `${any} ${translate(SpellListMessage.And)} ${plus}`;
  return targets.you === undefined
    ? together
    : `${translate(SpellListMessage.TargetYou, { you: targets.you })} ${together}`;
}

function span(translate: Translate, count: number, unit: SpellTimeUnit): string {
  return translate(SPELL_TIME_UNIT_MESSAGES[unit], { count });
}

/** The durations that carry nothing but their name. */
const FIXED_DURATION_MESSAGES = {
  [SpellDurationType.Sustained]: SpellListMessage.DurationSustained,
  [SpellDurationType.Unlimited]: SpellListMessage.DurationUnlimited,
  [SpellDurationType.Varies]: SpellListMessage.DurationVaries,
} as const;

/** A duration counted in a unit: "1 minute", "up to 1 minute", "sustained up to 1 minute". */
function timeDuration(duration: TimeDuration, translate: Translate): string {
  const text = span(translate, duration.count, duration.unit);
  if (duration.sustained === true) {
    return translate(SpellListMessage.DurationSustainedUpTo, { span: text });
  }
  return translate(duration.upTo === true ? SpellListMessage.DurationUpTo : SpellListMessage.DurationTime, {
    span: text,
  });
}

function singleDuration(duration: SingleDuration, translate: Translate): string {
  if (duration.type === SpellDurationType.Time) {
    return timeDuration(duration, translate);
  }
  if (duration.type === SpellDurationType.Rolled) {
    return translate(SpellListMessage.DurationRolled, { dice: duration.dice, die: duration.die, unit: duration.unit });
  }
  if (duration.type === SpellDurationType.Until) {
    return translate(SpellListMessage.DurationUntil, {
      when: UNTIL_KEYS[duration.until],
      owner: duration.of ?? TurnOwner.Caster,
    });
  }
  return translate(FIXED_DURATION_MESSAGES[duration.type]);
}

/** "1 minute", "sustained up to 1 minute", "until the end of your turn"; undefined for an instant spell. */
export function durationText(duration: SpellData['duration'], translate: Translate): string | undefined {
  if (duration === undefined) {
    return undefined;
  }
  return duration.type === SpellDurationType.Either
    ? joined(
        translate,
        duration.options.map((option) => singleDuration(option, translate)),
      )
    : singleDuration(duration, translate);
}

/** The save's name in the select the messages use: `save:reflex` is `reflex`. */
function saveName(selector: string): string {
  return selector.replace(/^save:/u, '');
}

/** "Reflex", "basic Reflex", "AC", "Fortitude DC", joined; undefined when the spell is resisted with nothing. */
export function defenceText(defense: SpellData['defense'], translate: Translate): string | undefined {
  if (defense === undefined) {
    return undefined;
  }
  const save =
    defense.save === undefined
      ? []
      : [
          translate(SpellListMessage.DefenceSave, {
            basic: defense.save.basic ? YES : NO,
            save: saveName(defense.save.statistic),
          }),
        ];
  const against =
    defense.against === undefined
      ? []
      : [
          defense.against === 'ac'
            ? translate(SpellListMessage.DefenceAc)
            : translate(SpellListMessage.DefenceDc, { save: saveName(defense.against) }),
        ];
  return [...save, ...against].join(', ');
}

/** One line per damage or healing part: "6d6 fire", "2d8 healing". */
export function effectLines(damage: SpellCast['damage'], translate: Translate): readonly SpellEffectLine[] {
  return damage.map((part) => {
    const heals = part.kinds.includes(DamageKind.Healing);
    const harms = part.kinds.includes(DamageKind.Damage);
    const damageType = part.damageType === undefined ? undefined : translate(DAMAGE_TYPE_MESSAGES[part.damageType]);
    let key: string = SpellListMessage.EffectDamage;
    if (heals && harms) {
      key = SpellListMessage.EffectBoth;
    } else if (heals) {
      key = SpellListMessage.EffectHealing;
    }
    return {
      key: part.key,
      text: translate(key, {
        formula: part.formula,
        hasCategory: part.category === undefined ? NO : YES,
        category: part.category === undefined ? '' : translate(DAMAGE_CATEGORY_MESSAGES[part.category]),
        hasType: damageType === undefined ? NO : YES,
        damageType: damageType ?? '',
      }),
    };
  });
}
