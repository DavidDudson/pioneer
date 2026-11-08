import type { TranslocoService } from '@jsverse/transloco';
import type { CriticalEffect, CriticalRange, ExtraDice } from '@pioneer/rules/engine';
import {
  CriticalCondition,
  CriticalDamageAmountType,
  CriticalDamageTargetType,
  CriticalDurationType,
  CriticalEffectKind,
  CriticalSaveStatistic as SaveStatistic,
} from '@pioneer/rules/sdk';
import type { CriticalDuration, CriticalSaveStatistic } from '@pioneer/rules/sdk';

import { DAMAGE_TYPE_MESSAGES, DURATION_MESSAGES } from '../rich-text/rich-text-messages';
import {
  CRITICAL_DURATION_MESSAGES,
  CriticalEffectMessage,
  DAMAGE_CATEGORY_MESSAGES,
  StrikesMessage,
  yesNo,
} from './strikes-messages';
/** The message of each condition a critical hit can give. */
const CONDITION_MESSAGES: Readonly<Record<CriticalCondition, string>> = {
  [CriticalCondition.Clumsy]: 'rules.strikes.criticalEffect.conditions.clumsy',
  [CriticalCondition.Deafened]: 'rules.strikes.criticalEffect.conditions.deafened',
  [CriticalCondition.Immobilized]: 'rules.strikes.criticalEffect.conditions.immobilized',
  [CriticalCondition.Slowed]: 'rules.strikes.criticalEffect.conditions.slowed',
};

/** The message of each saving throw a critical effect allows. */
const SAVE_MESSAGES: Readonly<Record<CriticalSaveStatistic, string>> = {
  [SaveStatistic.Fortitude]: 'rules.strikes.criticalEffect.saves.fortitude',
  [SaveStatistic.Reflex]: 'rules.strikes.criticalEffect.saves.reflex',
  [SaveStatistic.Will]: 'rules.strikes.criticalEffect.saves.will',
};

/** Words a message key and its parameters in the viewer's locale. */
type Say = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** "until the end of your next turn", "for 1 minute" or "permanently". */
function durationText(say: Say, duration: CriticalDuration): string {
  if (duration.type === CriticalDurationType.Time) {
    const span = say(DURATION_MESSAGES[duration.unit], { count: duration.count });
    return say(CRITICAL_DURATION_MESSAGES[CriticalDurationType.Time], { span });
  }
  return say(CRITICAL_DURATION_MESSAGES[duration.type]);
}

/**
 * What a critical hit does besides its damage, as a line led by the name of the rune or feat it comes from: "Frost: on
 * a critical hit, the target is Slowed 1 until the end of your next turn, unless it succeeds at a DC 24 Fortitude save".
 */
export function criticalEffectText(i18n: TranslocoService, source: string, { effect }: CriticalEffect): string {
  const say: Say = (key, params): string => i18n.translate(key, params);
  if (effect.kind === CriticalEffectKind.Condition) {
    const worse = effect.criticalFailureDuration;
    return say(CriticalEffectMessage.Condition, {
      source,
      condition: say(CONDITION_MESSAGES[effect.condition]),
      hasValue: effect.value === undefined ? 'no' : 'yes',
      value: effect.value ?? 0,
      duration: durationText(say, effect.duration),
      hasSave: effect.save === undefined ? 'no' : 'yes',
      dc: effect.save?.dc ?? 0,
      save: effect.save === undefined ? '' : say(SAVE_MESSAGES[effect.save.statistic]),
      hasWorse: worse === undefined ? 'no' : 'yes',
      worse: worse === undefined ? '' : durationText(say, worse),
    });
  }
  const amount =
    effect.amount.type === CriticalDamageAmountType.Equal
      ? say(CriticalEffectMessage.EqualDamage)
      : `${effect.amount.count}${effect.amount.die}`;
  const damage = {
    source,
    amount,
    type: say(DAMAGE_TYPE_MESSAGES[effect.damageType]),
    ignores: effect.ignoresResistance === true ? 'yes' : 'no',
  };
  return effect.target.type === CriticalDamageTargetType.Others
    ? say(CriticalEffectMessage.DamageOthers, { ...damage, count: effect.target.count, range: effect.target.within })
    : say(CriticalEffectMessage.DamageArmor, damage);
}

/** "Plus 1d6 fire precision": the dice a damage element adds to a Strike's damage, worded in the viewer's locale. */
export function extraDiceText(
  i18n: TranslocoService,
  { count, die, damageType, category, critical, ignoresResistance }: ExtraDice,
): string {
  const say = (key: string, params?: Readonly<Record<string, string | number>>): string => i18n.translate(key, params);
  return say(StrikesMessage.ExtraDice, {
    dice: `${count}${die}`,
    type: say(DAMAGE_TYPE_MESSAGES[damageType]),
    hasCategory: category === undefined ? 'no' : 'yes',
    category: category === undefined ? '' : say(DAMAGE_CATEGORY_MESSAGES[category]),
    ...yesNo({ critical, ignoresResistance }),
  });
}

/** "Keen: a natural 19 on the attack is a critical hit, as long as it succeeds": a rune or feat that widens the range. */
export function criticalRangeText(i18n: TranslocoService, source: string, { natural }: CriticalRange): string {
  return i18n.translate(StrikesMessage.CriticalRange, { source, natural });
}
