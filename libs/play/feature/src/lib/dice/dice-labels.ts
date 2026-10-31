import { DAMAGE_TYPE_KEYS } from '@pioneer/play/ui';
import { DamageContext, DamageGroup } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';

/** Message keys for what a weakness or resistance can name: a damage type, a group of them, or where damage came from. */
export const DAMAGE_ADJUSTMENT_TARGET_KEYS: Readonly<Record<DamageAdjustmentTarget, string>> = {
  ...DAMAGE_TYPE_KEYS,
  [DamageGroup.All]: 'play.damageGroup.all',
  [DamageGroup.Physical]: 'play.damageGroup.physical',
  [DamageGroup.Energy]: 'play.damageGroup.energy',
  [DamageContext.AreaDamage]: 'play.damageContext.areaDamage',
  [DamageContext.SplashDamage]: 'play.damageContext.splashDamage',
  [DamageContext.Spells]: 'play.damageContext.spells',
};
