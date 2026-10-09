import { DamageCategory } from '@pioneer/rules/dice';
import { DamageType, DegreeOfSuccess } from '@pioneer/rules/sdk';

/** Message keys for damage type names, spelled out so the key check sees them. */
export const DAMAGE_TYPE_KEYS: Readonly<Record<DamageType, string>> = {
  [DamageType.Bludgeoning]: 'play.damageType.bludgeoning',
  [DamageType.Piercing]: 'play.damageType.piercing',
  [DamageType.Slashing]: 'play.damageType.slashing',
  [DamageType.Acid]: 'play.damageType.acid',
  [DamageType.Cold]: 'play.damageType.cold',
  [DamageType.Electricity]: 'play.damageType.electricity',
  [DamageType.Fire]: 'play.damageType.fire',
  [DamageType.Sonic]: 'play.damageType.sonic',
  [DamageType.Vitality]: 'play.damageType.vitality',
  [DamageType.Void]: 'play.damageType.void',
  [DamageType.Force]: 'play.damageType.force',
  [DamageType.Spirit]: 'play.damageType.spirit',
  [DamageType.Mental]: 'play.damageType.mental',
  [DamageType.Poison]: 'play.damageType.poison',
  [DamageType.Bleed]: 'play.damageType.bleed',
  [DamageType.Precision]: 'play.damageType.precision',
};

export const DAMAGE_CATEGORY_KEYS: Readonly<Record<DamageCategory, string>> = {
  [DamageCategory.Persistent]: 'play.damageCategory.persistent',
  [DamageCategory.Splash]: 'play.damageCategory.splash',
};

export const DEGREE_KEYS: Readonly<Record<DegreeOfSuccess, string>> = {
  [DegreeOfSuccess.CriticalSuccess]: 'play.degree.criticalSuccess',
  [DegreeOfSuccess.Success]: 'play.degree.success',
  [DegreeOfSuccess.Failure]: 'play.degree.failure',
  [DegreeOfSuccess.CriticalFailure]: 'play.degree.criticalFailure',
};
