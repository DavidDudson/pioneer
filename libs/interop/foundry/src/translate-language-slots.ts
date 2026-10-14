import { RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** Foundry's extra language slots: an `ActiveEffectLike` adding a whole number to the most languages a character knows. */
const FoundryLanguageSlots = z.strictObject({
  key: z.literal('ActiveEffectLike'),
  mode: z.literal('add'),
  path: z.literal('system.build.languages.max'),
  value: z.number().int().positive(),
  predicate: z.unknown().optional(),
});

/**
 * Foundry's `ActiveEffectLike` adding language slots (Nomadic Halfling's two), as a `Language` element opening them.
 * A formula value (Multilingual's by Society rank) or any other field leaves it for the backlog.
 */
export function withLanguageSlots(raw: unknown): unknown {
  const slots = FoundryLanguageSlots.safeParse(raw);
  if (!slots.success) {
    return raw;
  }
  const { value, predicate } = slots.data;
  return { key: RuleElementKey.Language, slots: value, ...(predicate === undefined ? {} : { predicate }) };
}
