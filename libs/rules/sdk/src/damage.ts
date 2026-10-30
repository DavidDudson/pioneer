import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { DamageException } from './trait';
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

/**
 * Where damage came from, which a weakness or resistance can name instead of a type (`weakness 5 to area damage`):
 * area damage is from an area effect, splash damage is the splash of an attack.
 */
export const DamageContext = { AreaDamage: 'area-damage', SplashDamage: 'splash-damage' } as const;
export type DamageContext = ValueOf<typeof DamageContext>;
export const DamageContextSchema = z.enum(DamageContext);

/** What a weakness or resistance applies to: a damage type, a group (`resistance 5 physical`) or a source. */
export const DamageAdjustmentTarget = { ...DamageType, ...DamageGroup, ...DamageContext } as const;
export type DamageAdjustmentTarget = ValueOf<typeof DamageAdjustmentTarget>;
export const DamageAdjustmentTargetSchema = z.enum(DamageAdjustmentTarget);

const EXCEPTIONS_MAX = 8;

/** The damage traits a defence makes an exception for. */
export const DamageExceptions = z.array(DamageException).max(EXCEPTIONS_MAX).readonly();

/** A weakness or resistance to a damage type or group, and the damage traits it does not cover. */
export const DamageAdjustment = z.object({
  type: DamageAdjustmentTargetSchema,
  value: DamageAmount,
  exceptions: DamageExceptions.optional(),
});
export type DamageAdjustment = z.infer<typeof DamageAdjustment>;

/**
 * A damage type's `data` on the `ContentEntry` envelope: none yet. The engine's types are `DamageType`; an entry
 * gives one its name, description and source. Which group a type is in stays with `DAMAGE_GROUP_TYPES`, as Foundry
 * pf2e keeps it in code, so content can't disagree with the weaknesses and resistances that use it.
 */
export const DamageTypeData = z.strictObject({});
export type DamageTypeData = z.infer<typeof DamageTypeData>;
