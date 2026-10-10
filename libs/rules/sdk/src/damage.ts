import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

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

/** Groups of damage types a weakness or resistance can name instead of one type. */
export const DamageGroup = { All: 'all', Physical: 'physical', Energy: 'energy' } as const;
export type DamageGroup = ValueOf<typeof DamageGroup>;
export const DamageGroupSchema = z.enum(DamageGroup);

/** The types each listed group covers; `all` covers every type, and untyped damage too. */
export const DAMAGE_GROUP_TYPES: Readonly<
  Record<typeof DamageGroup.Physical | typeof DamageGroup.Energy, readonly DamageType[]>
> = {
  // Foundry pf2e counts bleed as physical (ADR-0008), so physical resistance reduces it.
  [DamageGroup.Physical]: [DamageType.Bleed, DamageType.Bludgeoning, DamageType.Piercing, DamageType.Slashing],
  [DamageGroup.Energy]: [
    DamageType.Acid,
    DamageType.Cold,
    DamageType.Electricity,
    DamageType.Fire,
    DamageType.Force,
    DamageType.Sonic,
    DamageType.Vitality,
    DamageType.Void,
  ],
};

/** What a weakness or resistance applies to: one damage type, or a group (`resistance 5 physical`). */
export const DamageAdjustmentTarget = { ...DamageType, ...DamageGroup } as const;
export type DamageAdjustmentTarget = ValueOf<typeof DamageAdjustmentTarget>;
export const DamageAdjustmentTargetSchema = z.enum(DamageAdjustmentTarget);

/** A weakness or resistance to a damage type or group. */
export const DamageAdjustment = z.object({ type: DamageAdjustmentTargetSchema, value: DamageAmount });
export type DamageAdjustment = z.infer<typeof DamageAdjustment>;

/** The group a damage type belongs to; mental, poison and spirit belong to none. */
export const DamageTypeGroup = { Physical: DamageGroup.Physical, Energy: DamageGroup.Energy } as const;
export type DamageTypeGroup = ValueOf<typeof DamageTypeGroup>;
const DamageTypeGroupSchema = z.enum(DamageTypeGroup);

/**
 * A damage type's `data` on the `ContentEntry` envelope. The engine's types are `DamageType`; an entry gives one a
 * name, description and source, and homebrew a way to add more.
 */
export const DamageTypeData = z.strictObject({ group: DamageTypeGroupSchema.optional() });
export type DamageTypeData = z.infer<typeof DamageTypeData>;
