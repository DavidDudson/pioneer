import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

/**
 * PF2e bonus and penalty types. Within a typed category only the highest bonus and the lowest
 * penalty apply; untyped ones all apply; attribute and proficiency come from the base formula.
 */
export const ModifierType = {
  Untyped: 'untyped',
  Status: 'status',
  Circumstance: 'circumstance',
  Item: 'item',
  Proficiency: 'proficiency',
  Attribute: 'attribute',
  Potency: 'potency',
} as const;
export type ModifierType = ValueOf<typeof ModifierType>;
export const ModifierTypeSchema = z.enum(ModifierType);
