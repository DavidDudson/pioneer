import { Pg } from '@pioneer/shared/kernel';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { CampaignRuleLimitId } from './campaign-fields';

/**
 * The numbers a campaign can change for its inventories. The values name the character context's `RuleLimits` fields
 * (ADR-0064), which the campaign context may not import, so the composition root's adapter hands them over by name.
 */
export const RuleLimitKey = {
  InvestedMax: 'investedMax',
  HandsMax: 'handsMax',
  PropertyRunesPerGrade: 'propertyRunesPerGrade',
  ItemsMax: 'itemsMax',
} as const;
export type RuleLimitKey = ValueOf<typeof RuleLimitKey>;
export const RuleLimitKeySchema = z.enum(RuleLimitKey);

/** A number a limit takes: a whole number from 1. Each limit's ceiling is `LIMIT_CEILINGS`. */
export const RuleLimitValue = Pg.smallint().positive().brand<'RuleLimitValue'>();
export type RuleLimitValue = z.infer<typeof RuleLimitValue>;

const CORE_INVESTED = RuleLimitValue.parse(10);
const CORE_HANDS = RuleLimitValue.parse(2);
const CORE_PROPERTY_RUNES = RuleLimitValue.parse(1);
const CORE_ITEMS = RuleLimitValue.parse(500);

/** What a limit is without a GM's number: the core rules'. A test in `apps/api` holds these to the character context's. */
export const CORE_LIMIT_DEFAULTS: Readonly<Record<RuleLimitKey, RuleLimitValue>> = {
  [RuleLimitKey.InvestedMax]: CORE_INVESTED,
  [RuleLimitKey.HandsMax]: CORE_HANDS,
  [RuleLimitKey.PropertyRunesPerGrade]: CORE_PROPERTY_RUNES,
  [RuleLimitKey.ItemsMax]: CORE_ITEMS,
};

const CEILING_INVESTED = RuleLimitValue.parse(100);
const CEILING_HANDS = RuleLimitValue.parse(10);
const CEILING_PROPERTY_RUNES = RuleLimitValue.parse(10);
const CEILING_ITEMS = RuleLimitValue.parse(5000);

/** The most a GM can set each limit to; far past any table's need, so a typo cannot store nonsense. */
export const LIMIT_CEILINGS: Readonly<Record<RuleLimitKey, RuleLimitValue>> = {
  [RuleLimitKey.InvestedMax]: CEILING_INVESTED,
  [RuleLimitKey.HandsMax]: CEILING_HANDS,
  [RuleLimitKey.PropertyRunesPerGrade]: CEILING_PROPERTY_RUNES,
  [RuleLimitKey.ItemsMax]: CEILING_ITEMS,
};

/**
 * Where the number in force for a limit comes from, lowest first: the core rules, a variant rule the campaign has on,
 * then the GM's own number (ADR-0064). The character context's `RuleLimitSource` names the same values.
 */
export const RuleLimitSource = {
  Core: 'core',
  Variant: 'variant',
  Campaign: 'campaign',
} as const;
export type RuleLimitSource = ValueOf<typeof RuleLimitSource>;
export const RuleLimitSourceSchema = z.enum(RuleLimitSource);

/** The limits some layer changes; a limit it leaves out is not changed. */
export type RuleLimitOverrides = Readonly<Partial<Record<RuleLimitKey, RuleLimitValue>>>;

/** A limit a campaign has set. Absent means the core number. */
export interface CampaignRuleLimit {
  readonly id: CampaignRuleLimitId;
  readonly limit: RuleLimitKey;
  readonly value: RuleLimitValue;
  /** The GM who set it; absent once their account is deleted. */
  readonly setBy: UserId | undefined;
  readonly setAt: Temporal.Instant;
}

/** One limit as a campaign's member sees it. */
export const RuleLimitSetting = z.object({
  limit: RuleLimitKeySchema,
  /** The number in force: the GM's, else the variant rules in force, else the core rules'. */
  value: RuleLimitValue,
  /** The core rules' number, which a reset returns to. */
  core: RuleLimitValue,
  /** The most the GM can set it to. */
  ceiling: RuleLimitValue,
  /** Whether the GM set it; a reset removes that. */
  custom: z.boolean(),
  /** Where the number in force comes from. */
  source: RuleLimitSourceSchema,
});
export type RuleLimitSetting = z.output<typeof RuleLimitSetting>;

/** JSON shape of a campaign's table limits, as one of its members sees them. */
export const CampaignRuleLimits = z.object({
  /** Whether the viewer may change the limits: the GM. */
  manageable: z.boolean(),
  /** Every limit, in a fixed order. */
  limits: z.array(RuleLimitSetting).readonly(),
});
export type CampaignRuleLimits = z.output<typeof CampaignRuleLimits>;

/** The number the GM sets a limit to. */
export const SetRuleLimitBody = z.object({ value: RuleLimitValue });
export type SetRuleLimitBody = z.infer<typeof SetRuleLimitBody>;

/** A limit and the number it is set to. */
export interface RuleLimitChange {
  readonly limit: RuleLimitKey;
  readonly value: RuleLimitValue;
}
