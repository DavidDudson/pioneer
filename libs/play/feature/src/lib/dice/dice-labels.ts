import { DamageGroup } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';
import { DAMAGE_TYPE_KEYS } from '@pioneer/play/ui';

/** Message keys for what a weakness or resistance can name: any damage type, or a group of them. */
export const DAMAGE_ADJUSTMENT_TARGET_KEYS: Readonly<Record<DamageAdjustmentTarget, string>> = {
  ...DAMAGE_TYPE_KEYS,
  [DamageGroup.All]: 'play.damageGroup.all',
  [DamageGroup.Physical]: 'play.damageGroup.physical',
  [DamageGroup.Energy]: 'play.damageGroup.energy',
};
