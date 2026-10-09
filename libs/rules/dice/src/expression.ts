import { DamageTypeSchema } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { DiceCount, DieSize, FlatValue, TERM_COUNT_MAX } from './units';

/** Whether a term adds to or subtracts from the total. */
export const Sign = { Plus: '+', Minus: '-' } as const;
export type Sign = ValueOf<typeof Sign>;
export const SignSchema = z.enum(Sign);

/** `kh` keeps the highest dice of a term, `kl` the lowest (`4d6kh3`). */
export const KeepMode = { Highest: 'kh', Lowest: 'kl' } as const;
export type KeepMode = ValueOf<typeof KeepMode>;
export const KeepModeSchema = z.enum(KeepMode);

/** How damage from a term is dealt, beyond its type. Applying it is the damage step's job. */
export const DamageCategory = { Persistent: 'persistent', Splash: 'splash' } as const;
export type DamageCategory = ValueOf<typeof DamageCategory>;
export const DamageCategorySchema = z.enum(DamageCategory);

export const TermKind = { Dice: 'dice', Flat: 'flat' } as const;
export type TermKind = ValueOf<typeof TermKind>;

export const Keep = z.object({ mode: KeepModeSchema, count: DiceCount });
export type Keep = z.infer<typeof Keep>;

/** Bracketed tags after a term: `[fire]`, `[persistent,bleed]`, `[splash,acid]`. */
export const DamageTags = z.object({
  type: DamageTypeSchema.optional(),
  category: DamageCategorySchema.optional(),
});
export type DamageTags = z.infer<typeof DamageTags>;

export const DiceTerm = z.object({
  kind: z.literal(TermKind.Dice),
  sign: SignSchema,
  count: DiceCount,
  size: DieSize,
  keep: Keep.optional(),
  tags: DamageTags,
});
export type DiceTerm = z.infer<typeof DiceTerm>;

export const FlatTerm = z.object({
  kind: z.literal(TermKind.Flat),
  sign: SignSchema,
  value: FlatValue,
  tags: DamageTags,
});
export type FlatTerm = z.infer<typeof FlatTerm>;

export const Term = z.discriminatedUnion('kind', [DiceTerm, FlatTerm]);
export type Term = z.infer<typeof Term>;

/** A parsed expression: terms in the order they were written. */
export const DiceExpression = z.object({ terms: z.array(Term).min(1).max(TERM_COUNT_MAX) });
export type DiceExpression = z.infer<typeof DiceExpression>;
