import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Hands, HANDS_MAX, INVESTED_MAX, InvestedCount } from './item-carry';

/** Property runes an item has room for per grade of its potency rune. */
export const PropertyRunesPerGrade = Pg.smallint().positive().brand<'PropertyRunesPerGrade'>();
export type PropertyRunesPerGrade = z.infer<typeof PropertyRunesPerGrade>;

/** A count of lines an inventory holds. */
export const ItemsMax = Pg.smallint().positive().brand<'ItemsMax'>();
export type ItemsMax = z.infer<typeof ItemsMax>;

/**
 * The numbers an inventory is held to: items invested, hands to hold things in, property runes per grade of potency
 * rune, and lines in the inventory. They are table data, not schema constants: a campaign or a variant rule may change
 * them, so every check reads them from here.
 */
export const RuleLimitsSchema = z.strictObject({
  investedMax: InvestedCount,
  handsMax: Hands,
  propertyRunesPerGrade: PropertyRunesPerGrade,
  itemsMax: ItemsMax,
});
export type RuleLimits = z.infer<typeof RuleLimitsSchema>;

const CORE_ITEMS_MAX = ItemsMax.parse(500);

/** The core rules' limits, which a table gets unless it changes them. */
export const CORE_RULE_LIMITS: RuleLimits = {
  investedMax: INVESTED_MAX,
  handsMax: HANDS_MAX,
  propertyRunesPerGrade: PropertyRunesPerGrade.parse(1),
  itemsMax: CORE_ITEMS_MAX,
};

/** `limit` held to `ceiling`: a table may lower a number, but the schema stores no more than the core allows. */
function within<TLimit extends number>(limit: TLimit, ceiling: TLimit): TLimit {
  return limit > ceiling ? ceiling : limit;
}

/**
 * The limits an in-app edit can be held to. A table may raise a limit past the core rules' for the lines an import
 * brought in, but the schema stores the player's lines up to the core numbers only (ADR-0064), so an edit is checked
 * against the lower of the two and never writes what the schema would reject.
 */
export function storableLimits(limits: RuleLimits = CORE_RULE_LIMITS): RuleLimits {
  return {
    investedMax: within(limits.investedMax, CORE_RULE_LIMITS.investedMax),
    handsMax: within(limits.handsMax, CORE_RULE_LIMITS.handsMax),
    propertyRunesPerGrade: within(limits.propertyRunesPerGrade, CORE_RULE_LIMITS.propertyRunesPerGrade),
    itemsMax: within(limits.itemsMax, CORE_RULE_LIMITS.itemsMax),
  };
}

/** The limits a table changed; a limit it left out is the core rules'. */
export const RuleLimitOverridesSchema = RuleLimitsSchema.partial();
export type RuleLimitOverrides = z.infer<typeof RuleLimitOverridesSchema>;

/** `overrides` laid over the core rules' limits. */
export function withOverrides(overrides: RuleLimitOverrides = {}): RuleLimits {
  return {
    investedMax: overrides.investedMax ?? CORE_RULE_LIMITS.investedMax,
    handsMax: overrides.handsMax ?? CORE_RULE_LIMITS.handsMax,
    propertyRunesPerGrade: overrides.propertyRunesPerGrade ?? CORE_RULE_LIMITS.propertyRunesPerGrade,
    itemsMax: overrides.itemsMax ?? CORE_RULE_LIMITS.itemsMax,
  };
}
