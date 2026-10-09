import { DamageCategory } from '@pioneer/rules/dice';
import { DamageGroup, DamageType, DegreeOfSuccess } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';

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

/** Label for damage with no type tag: its own instance, touched only by `all`-damage weakness and resistance. */
export const UNTYPED_DAMAGE_KEY = 'play.damageType.untyped';

/** Message keys for what a weakness or resistance can name: any damage type, or a group of them. */
export const DAMAGE_ADJUSTMENT_TARGET_KEYS: Readonly<Record<DamageAdjustmentTarget, string>> = {
  ...DAMAGE_TYPE_KEYS,
  [DamageGroup.All]: 'play.damageGroup.all',
  [DamageGroup.Physical]: 'play.damageGroup.physical',
  [DamageGroup.Energy]: 'play.damageGroup.energy',
};
