import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentRegistry } from './content-registry';
import type { VariantRuleId } from './variant-rule';

/** A number a variant rule sets a table limit to: a whole number from 1. */
export const VariantLimitValue = Pg.smallint().positive().brand<'VariantLimitValue'>();
export type VariantLimitValue = z.infer<typeof VariantLimitValue>;

const CEILING_INVESTED = VariantLimitValue.parse(100);
const CEILING_HANDS = VariantLimitValue.parse(10);
const CEILING_PROPERTY_RUNES = VariantLimitValue.parse(10);
const CEILING_ITEMS = VariantLimitValue.parse(5000);

/**
 * The table limits a variant rule may change: the character context's `RuleLimits` fields (ADR-0064), which this
 * package may not import, so a test in `apps/api` holds the names and ceilings to it. A limit left out is not changed.
 * A ceiling is the most a table can set, so a pack cannot store nonsense.
 */
export const VariantRuleLimits = z.strictObject({
  investedMax: VariantLimitValue.max(CEILING_INVESTED).optional(),
  handsMax: VariantLimitValue.max(CEILING_HANDS).optional(),
  propertyRunesPerGrade: VariantLimitValue.max(CEILING_PROPERTY_RUNES).optional(),
  itemsMax: VariantLimitValue.max(CEILING_ITEMS).optional(),
});
export type VariantRuleLimits = z.infer<typeof VariantRuleLimits>;

const LIMIT_NAMES = VariantRuleLimits.keyof().options;

/**
 * The limits of the variant rules in force laid together. Two variants that change the same limit conflict, and the
 * more permissive wins: every limit is a most, so the higher number (ADR-0064).
 */
export function mergeVariantLimits(declared: readonly VariantRuleLimits[]): VariantRuleLimits {
  const merged: { -readonly [Name in keyof VariantRuleLimits]: VariantLimitValue } = {};
  for (const limits of declared) {
    for (const name of LIMIT_NAMES) {
      const value = limits[name];
      const held = merged[name];
      if (value !== undefined && (held === undefined || value > held)) {
        merged[name] = value;
      }
    }
  }
  return merged;
}

/** The limits changed by the variant rules `enabled` that `registry` defines; one it does not define changes nothing. */
export function variantLimitsInForce(registry: ContentRegistry, enabled: readonly VariantRuleId[]): VariantRuleLimits {
  return mergeVariantLimits(
    enabled.flatMap((id) => {
      const limits = registry.variantRule(id)?.definition.limits;
      return limits === undefined ? [] : [limits];
    }),
  );
}
