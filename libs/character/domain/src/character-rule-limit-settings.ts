import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttachedCampaignName, PackAuthoritySchema } from './character-packs';
import { RuleLimitsSchema } from './rule-limits';

/** Row id of one table limit a character has set; the audit log keys every row by an `id`. */
export const CharacterRuleLimitId = Uuid.brand<'CharacterRuleLimitId'>();
export type CharacterRuleLimitId = z.infer<typeof CharacterRuleLimitId>;

/** The name of a limit a table can change: a field of `RuleLimits` (ADR-0064). */
export const RuleLimitFieldSchema = RuleLimitsSchema.keyof();
export type RuleLimitField = z.infer<typeof RuleLimitFieldSchema>;

/** A number a limit takes: a whole number from 1. Each limit's ceiling is `LIMIT_CEILINGS`. */
export const RuleLimitSettingValue = Pg.smallint().positive().brand<'RuleLimitSettingValue'>();
export type RuleLimitSettingValue = z.infer<typeof RuleLimitSettingValue>;

const CEILING_INVESTED = RuleLimitSettingValue.parse(100);
const CEILING_HANDS = RuleLimitSettingValue.parse(10);
const CEILING_PROPERTY_RUNES = RuleLimitSettingValue.parse(10);
const CEILING_ITEMS = RuleLimitSettingValue.parse(5000);

/**
 * The most an owner can set each limit to; far past any table's need, so a typo cannot store nonsense. A test in
 * `apps/api` holds these to the campaign context's, as a campaign and a character set limits alike.
 */
export const LIMIT_CEILINGS: Readonly<Record<RuleLimitField, RuleLimitSettingValue>> = {
  investedMax: CEILING_INVESTED,
  handsMax: CEILING_HANDS,
  propertyRunesPerGrade: CEILING_PROPERTY_RUNES,
  itemsMax: CEILING_ITEMS,
};

/** The order the limits are listed in. */
export const RULE_LIMIT_FIELDS: readonly RuleLimitField[] = RuleLimitFieldSchema.options;

/** A limit a character has set. Absent means the core number. */
export interface CharacterRuleLimit {
  readonly id: CharacterRuleLimitId;
  readonly limit: RuleLimitField;
  readonly value: RuleLimitSettingValue;
  /** The owner who set it; absent once their account is deleted. */
  readonly setBy: UserId | undefined;
  readonly setAt: Temporal.Instant;
}

/** One limit as the character's owner sees it. */
export const CharacterRuleLimitSetting = z.object({
  limit: RuleLimitFieldSchema,
  /** The number in force: the campaign's, else the owner's, else the core rules'. */
  value: RuleLimitSettingValue,
  /** The core rules' number, which a reset returns to. */
  core: RuleLimitSettingValue,
  /** The most the owner can set it to. */
  ceiling: RuleLimitSettingValue,
  /** Whether the number in force differs from the core rules': set by the owner, or by the campaign's GM. */
  custom: z.boolean(),
});
export type CharacterRuleLimitSetting = z.output<typeof CharacterRuleLimitSetting>;

/** JSON shape of a character's table limits: each limit, and who decides them. */
export const CharacterRuleLimitSettings = z.object({
  decidedBy: PackAuthoritySchema,
  /** The campaign that decides, when one does. */
  campaign: AttachedCampaignName.optional(),
  /** Whether the viewer may change the limits: the owner, while no campaign decides. */
  manageable: z.boolean(),
  /** Every limit, in a fixed order. */
  limits: z.array(CharacterRuleLimitSetting).readonly(),
});
export type CharacterRuleLimitSettings = z.output<typeof CharacterRuleLimitSettings>;

/** The number the owner sets a limit to. */
export const SetRuleLimitSettingBody = z.object({ value: RuleLimitSettingValue });
export type SetRuleLimitSettingBody = z.infer<typeof SetRuleLimitSettingBody>;

/** A limit and the number it is set to. */
export interface RuleLimitSettingChange {
  readonly limit: RuleLimitField;
  readonly value: RuleLimitSettingValue;
}
