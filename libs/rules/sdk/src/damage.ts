import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { uniqueItems } from './unique-items';
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

/**
 * What lets a damage instance get past a weakness, resistance or immunity: a precious material it is made of, or the
 * `magical` trait (`resistance 5 physical except adamantine`). Foundry pf2e keeps the list in code; this one grows
 * as content needs more.
 */
export const DamageException = {
  Adamantine: 'adamantine',
  ColdIron: 'cold-iron',
  Silver: 'silver',
  Orichalcum: 'orichalcum',
  Magical: 'magical',
} as const;
export type DamageException = ValueOf<typeof DamageException>;
export const DamageExceptionSchema = z.enum(DamageException);

/** A defence's exceptions, each once. */
export const DamageExceptions = z
  .array(DamageExceptionSchema)
  .max(Object.keys(DamageException).length)
  .readonly()
  .check(uniqueItems);
export type DamageExceptions = z.infer<typeof DamageExceptions>;

/**
 * A weakness or resistance to a damage type or group. An instance with one of its `exceptions` gets past it; damage
 * instances carry no traits yet, so none does.
 */
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
