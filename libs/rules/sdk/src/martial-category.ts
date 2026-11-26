import type { ValueOf } from '@pioneer/shared/kernel';

export const WeaponCategory = {
  Unarmed: 'unarmed',
  Simple: 'simple',
  Martial: 'martial',
  Advanced: 'advanced',
} as const;

export type WeaponCategory = ValueOf<typeof WeaponCategory>;

export const ArmorCategory = {
  Unarmored: 'unarmored',
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;

export type ArmorCategory = ValueOf<typeof ArmorCategory>;
