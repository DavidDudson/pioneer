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
