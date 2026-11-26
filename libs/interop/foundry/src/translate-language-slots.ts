import { RuleElementKey } from '@pioneer/rules/sdk';
import { present } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { Fields } from './translate-choice-reads';

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
export function withLanguageSlots<Raw>(raw: Raw): Raw | Fields {
  const slots = FoundryLanguageSlots.safeParse(raw);

  if (!slots.success) {
    return raw;
  }

  const { value, predicate } = slots.data;

  return { key: RuleElementKey.Language, slots: value, ...present({ predicate }) };
}
