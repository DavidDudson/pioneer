import { DamageCategory } from '@pioneer/rules/dice';
import { DamageType, DegreeOfSuccess } from '@pioneer/rules/sdk';

/** Message keys for damage type names, spelled out so the key check sees them. */
export const DAMAGE_TYPE_KEYS: Readonly<Record<DamageType, string>> = {
  [DamageType.Bludgeoning]: 'roll.damageType.bludgeoning',
  [DamageType.Piercing]: 'roll.damageType.piercing',
  [DamageType.Slashing]: 'roll.damageType.slashing',
  [DamageType.Acid]: 'roll.damageType.acid',
  [DamageType.Cold]: 'roll.damageType.cold',
  [DamageType.Electricity]: 'roll.damageType.electricity',
  [DamageType.Fire]: 'roll.damageType.fire',
  [DamageType.Sonic]: 'roll.damageType.sonic',
  [DamageType.Vitality]: 'roll.damageType.vitality',
  [DamageType.Void]: 'roll.damageType.void',
  [DamageType.Force]: 'roll.damageType.force',
  [DamageType.Spirit]: 'roll.damageType.spirit',
  [DamageType.Mental]: 'roll.damageType.mental',
  [DamageType.Poison]: 'roll.damageType.poison',
  [DamageType.Bleed]: 'roll.damageType.bleed',
  [DamageType.Precision]: 'roll.damageType.precision',
};

export const DAMAGE_CATEGORY_KEYS: Readonly<Record<DamageCategory, string>> = {
  [DamageCategory.Persistent]: 'roll.damageCategory.persistent',
  [DamageCategory.Splash]: 'roll.damageCategory.splash',
};

export const DEGREE_KEYS: Readonly<Record<DegreeOfSuccess, string>> = {
  [DegreeOfSuccess.CriticalSuccess]: 'roll.degree.criticalSuccess',
  [DegreeOfSuccess.Success]: 'roll.degree.success',
  [DegreeOfSuccess.Failure]: 'roll.degree.failure',
  [DegreeOfSuccess.CriticalFailure]: 'roll.degree.criticalFailure',
};

/** Label for damage with no type tag: its own instance, touched only by `all`-damage weakness and resistance. */
export const UNTYPED_DAMAGE_KEY = 'roll.damageType.untyped';
