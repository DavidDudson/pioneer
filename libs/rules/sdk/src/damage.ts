import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { DamageAmount } from './units';

/** Remaster damage types (Player Core). */
export const DamageType = {
  Bludgeoning: 'bludgeoning',
  Piercing: 'piercing',
  Slashing: 'slashing',
  Acid: 'acid',
  Cold: 'cold',
  Electricity: 'electricity',
  Fire: 'fire',
  Sonic: 'sonic',
  Vitality: 'vitality',
  Void: 'void',
  Force: 'force',
  Spirit: 'spirit',
  Mental: 'mental',
  Poison: 'poison',
  Bleed: 'bleed',
  Precision: 'precision',
} as const;
export type DamageType = ValueOf<typeof DamageType>;
export const DamageTypeSchema = z.enum(DamageType);

/** A weakness or resistance to one damage type. */
export const DamageAdjustment = z.object({ type: DamageTypeSchema, value: DamageAmount });
export type DamageAdjustment = z.infer<typeof DamageAdjustment>;
